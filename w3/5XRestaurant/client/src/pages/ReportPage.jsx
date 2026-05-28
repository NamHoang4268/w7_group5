import { Navigate } from 'react-router-dom';

// ReportPage đã được gộp vào BillPage (tab Biểu đồ).
// Redirect về /dashboard/bill để không bị broken link.
const ReportPage = () => <Navigate to="/dashboard/bill" replace />;

export default ReportPage;
