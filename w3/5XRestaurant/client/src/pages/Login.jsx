import { LoginForm } from '@/components/login/login-form';
import banner from '@/assets/register_banner.jpg';
import { TypeAnimation } from 'react-type-animation';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo2.png';

export default function LoginPage() {
    return (
        <div className="grid min-h-svh">
            <div className="overflow-hidden grid lg:grid-cols-2">
                <div className="flex flex-col gap-4 p-6 md:p-10">
                    <div className="flex justify-center gap-2 md:justify-start mb-2">
                        <Link
                            to="/"
                            className="flex items-center gap-2 font-bold text-lg"
                        >
                            <img src={logo} alt="Logo" width={30} height={30} />
                            EatEase
                        </Link>
                    </div>
                    <div className="flex flex-1 items-center justify-center">
                        <div className="w-full md:max-w-md xl:max-w-2xl">
                            <LoginForm />
                        </div>
                    </div>
                </div>
                <div
                    className="hidden bg-muted lg:flex justify-center items-center opacity-85"
                    style={{
                        backgroundImage: `url(${banner})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                    }}
                >
                    <h1 className="px-4 py-2 text-foreground bg-background/90 rounded-md font-bold text-2xl">
                        <TypeAnimation
                            sequence={['Chào mừng bạn trở lại!', 800, '', 500]}
                            wrapper="span"
                            speed={75}
                            repeat={Infinity}
                        />
                    </h1>
                </div>
            </div>
        </div>
    );
}
