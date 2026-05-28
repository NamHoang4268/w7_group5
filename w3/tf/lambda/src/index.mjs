import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

const client = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const KB_ID = process.env.BEDROCK_KB_ID;
const MODEL_ARN = process.env.BEDROCK_MODEL_ARN;

const SYSTEM_PROMPT = `Bạn là trợ lý AI của EatEase Restaurant — một nhà hàng hiện đại.
Trả lời bằng tiếng Việt, thân thiện, dùng emoji phù hợp (🍜 🍕 🥗 ✨ 😊).
Trả lời ngắn gọn, súc tích. CHỈ giới thiệu thông tin có trong tài liệu.
Nếu không tìm thấy thông tin, hãy nói rõ và gợi ý liên hệ nhân viên.`;

/**
 * Lambda handler — API Gateway HTTP API (v2) event format
 */
export const handler = async (event) => {
  console.log("[Bedrock Lambda] Received event:", JSON.stringify(event));

  const origin = event.headers?.origin || event.headers?.Origin || "*";
  
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.requestContext?.http?.method === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  try {
    // Parse body
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const message = body?.message?.trim();

    if (!message) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: true,
          message: "Tin nhắn không được để trống",
        }),
      };
    }

    console.log("[Bedrock Lambda] User message:", message);

    if (!KB_ID || !MODEL_ARN) {
      console.error("[Bedrock Lambda] Missing KB_ID or MODEL_ARN env vars");
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: true,
          message: "Cấu hình AI chưa sẵn sàng. Vui lòng thử lại sau.",
        }),
      };
    }

    // Build RetrieveAndGenerate request
    const command = new RetrieveAndGenerateCommand({
      input: { text: `${SYSTEM_PROMPT}\n\nCâu hỏi của khách hàng: ${message}` },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId: KB_ID,
          modelArn: MODEL_ARN,
          retrievalConfiguration: {
            vectorSearchConfiguration: {
              numberOfResults: 5,
            },
          },
          generationConfiguration: {
            inferenceConfig: {
              textInferenceConfig: {
                maxTokens: 512,
                temperature: 0.7,
                topP: 0.9,
              },
            },
          },
        },
      },
    });

    console.log("[Bedrock Lambda] Calling RetrieveAndGenerate...");
    const response = await client.send(command);
    console.log("[Bedrock Lambda] Response received");

    const reply =
      response.output?.text || "Xin lỗi, tôi không thể trả lời lúc này.";

    // Extract source citations
    const sources = (response.citations || [])
      .flatMap((c) => c.retrievedReferences || [])
      .map((ref) => ({
        text: ref.content?.text?.substring(0, 200),
        location: ref.location?.s3Location?.uri,
      }))
      .filter((s) => s.text);

    console.log("[Bedrock Lambda] Reply length:", reply.length, "Sources:", sources.length);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        error: false,
        message: "Thành công",
        data: {
          reply,
          sources,
          provider: "Amazon Bedrock",
        },
      }),
    };
  } catch (error) {
    console.error("[Bedrock Lambda] Error:", error);

    const statusCode = error.name === "ThrottlingException" ? 429 : 500;
    const userMessage =
      statusCode === 429
        ? "Hệ thống AI đang quá tải, vui lòng thử lại sau vài giây ⏳"
        : "Lỗi kết nối AI. Vui lòng thử lại sau.";

    return {
      statusCode,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: true,
        message: userMessage,
      }),
    };
  }
};
