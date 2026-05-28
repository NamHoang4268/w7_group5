import React, { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

interface PlasmaProps {
    color?: string;
    speed?: number;
    direction?: 'forward' | 'reverse' | 'pingpong';
    scale?: number;
    opacity?: number;
    mouseInteractive?: boolean;
}

const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [1, 0.5, 0.2];
    return [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
    ];
};

const vertex = `#version 300 es
precision lowp float;
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Giảm loop 60 → 28, lowp precision, loại bỏ finite/sanitize check
const fragment = `#version 300 es
precision lowp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uCustomColor;
uniform float uUseCustomColor;
uniform float uSpeed;
uniform float uDirection;
uniform float uScale;
uniform float uOpacity;
uniform vec2 uMouse;
uniform float uMouseInteractive;
out vec4 fragColor;

void mainImage(out vec4 o, vec2 C) {
  vec2 center = iResolution.xy * 0.5;
  C = (C - center) / uScale + center;

  vec2 mouseOffset = (uMouse - center) * 0.0002;
  C += mouseOffset * length(C - center) * step(0.5, uMouseInteractive);

  float i, d, z, T = iTime * uSpeed * uDirection;
  vec3 O, p, S;

  for (vec2 r = iResolution.xy, Q; ++i < 28.; O += o.w/d*o.xyz) {
    p = z * normalize(vec3(C - .5*r, r.y));
    p.z -= 4.;
    S = p;
    d = p.y - T;

    p.x += .4*(1.+p.y)*sin(d + p.x*0.1)*cos(.34*d + p.x*0.05);
    Q = p.xz *= mat2(cos(p.y + vec4(0,11,33,0) - T));
    z += d = abs(sqrt(length(Q*Q)) - .25*(5.+S.y))/3. + 8e-4;
    o = 1. + sin(S.y + p.z*.5 + S.z - length(S-p) + vec4(2,1,0,8));
  }

  o.xyz = tanh(O / 1e4);
}

void main() {
  vec4 o = vec4(0.0);
  mainImage(o, gl_FragCoord.xy);
  vec3 rgb = clamp(o.rgb, 0.0, 1.0);

  float intensity = (rgb.r + rgb.g + rgb.b) / 3.0;
  vec3 customColor = intensity * uCustomColor;
  vec3 finalColor = mix(rgb, customColor, step(0.5, uUseCustomColor));

  float alpha = length(rgb) * uOpacity;
  fragColor = vec4(finalColor, alpha);
}`;

export const Plasma: React.FC<PlasmaProps> = ({
    color = '#ffffff',
    speed = 1,
    direction = 'forward',
    scale = 1,
    opacity = 1,
    mouseInteractive = true,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const useCustomColor = color ? 1.0 : 0.0;
        const customColorRgb = color ? hexToRgb(color) : [1, 1, 1];
        const directionMultiplier = direction === 'reverse' ? -1.0 : 1.0;

        // dpr cap tại 1 — giảm 4x pixel so với dpr=2
        const renderer = new Renderer({
            webgl: 2,
            alpha: true,
            antialias: false,
            dpr: 1,
        });
        const gl = renderer.gl;
        const canvas = gl.canvas as HTMLCanvasElement;
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        containerRef.current.appendChild(canvas);

        const geometry = new Triangle(gl);
        const program = new Program(gl, {
            vertex,
            fragment,
            uniforms: {
                iTime: { value: 0 },
                iResolution: { value: new Float32Array([1, 1]) },
                uCustomColor: {
                    value: new Float32Array(customColorRgb as number[]),
                },
                uUseCustomColor: { value: useCustomColor },
                uSpeed: { value: speed * 0.4 },
                uDirection: { value: directionMultiplier },
                uScale: { value: scale },
                uOpacity: { value: opacity },
                uMouse: { value: new Float32Array([0, 0]) },
                uMouseInteractive: { value: mouseInteractive ? 1.0 : 0.0 },
            },
        });
        const mesh = new Mesh(gl, { geometry, program });

        // Mouse throttle ~60fps (16ms)
        let mousePending = false;
        const handleMouseMove = (e: MouseEvent) => {
            if (!mouseInteractive || mousePending) return;
            mousePending = true;
            window.setTimeout(() => {
                mousePending = false;
            }, 16);
            const rect = containerRef.current!.getBoundingClientRect();
            const mu = program.uniforms.uMouse.value as Float32Array;
            mu[0] = e.clientX - rect.left;
            mu[1] = e.clientY - rect.top;
        };
        if (mouseInteractive) {
            containerRef.current.addEventListener(
                'mousemove',
                handleMouseMove,
                { passive: true }
            );
        }

        const setSize = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const w = Math.max(1, Math.floor(rect.width));
            const h = Math.max(1, Math.floor(rect.height));
            renderer.setSize(w, h);
            const res = program.uniforms.iResolution.value as Float32Array;
            res[0] = gl.drawingBufferWidth;
            res[1] = gl.drawingBufferHeight;
        };

        // Resize debounce 150ms — tương tự LightPillar
        let resizeTimer: number | null = null;
        const ro = new ResizeObserver(() => {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(setSize, 150);
        });
        ro.observe(containerRef.current);
        setSize();

        // FPS cap 30fps — giảm 50% GPU load so với 60fps
        const TARGET_FPS = 30;
        const FRAME_MS = 1000 / TARGET_FPS;
        let raf = 0;
        let lastFrame = 0;
        const t0 = performance.now();

        const loop = (t: number) => {
            raf = requestAnimationFrame(loop);
            if (t - lastFrame < FRAME_MS) return;
            lastFrame = t - ((t - lastFrame) % FRAME_MS);

            let timeValue = (t - t0) * 0.001;

            if (direction === 'pingpong') {
                const pingpongDuration = 10;
                const segmentTime = timeValue % pingpongDuration;
                const isForward =
                    Math.floor(timeValue / pingpongDuration) % 2 === 0;
                const u = segmentTime / pingpongDuration;
                const smooth = u * u * (3 - 2 * u);
                const pingpongTime = isForward
                    ? smooth * pingpongDuration
                    : (1 - smooth) * pingpongDuration;
                (program.uniforms.uDirection as any).value = 1.0;
                (program.uniforms.iTime as any).value = pingpongTime;
            } else {
                (program.uniforms.iTime as any).value = timeValue;
            }

            renderer.render({ scene: mesh });
        };
        raf = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            if (resizeTimer) clearTimeout(resizeTimer);
            if (mouseInteractive && containerRef.current) {
                containerRef.current.removeEventListener(
                    'mousemove',
                    handleMouseMove
                );
            }
            try {
                containerRef.current?.removeChild(canvas);
            } catch {}
        };
    }, [color, speed, direction, scale, opacity, mouseInteractive]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative overflow-hidden"
        />
    );
};

export default Plasma;
