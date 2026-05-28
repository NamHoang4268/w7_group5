import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { getRoleHomePath } from '../utils/routePermissions';

const PublicRoute = ({ children }) => {
    const user = useSelector((state) => state.user);

    // Nếu đã login thì chuyển hướng về dashboard của role
    if (user._id) {
        return <Navigate to={getRoleHomePath(user.role)} replace />;
    }

    return children;
};

export default PublicRoute;
