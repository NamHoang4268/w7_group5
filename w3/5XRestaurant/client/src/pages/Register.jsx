import banner from '@/assets/register_banner.jpg';
import { TypeAnimation } from 'react-type-animation';
import { RegisterForm } from '@/components/register/register-form';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo2.png';

export default function RegisterPage() {
    return (
        <div className="grid min-h-svh relative">
            <div className="overflow-hidden grid lg:grid-cols-[1.5fr_2fr]">
                <div
                    className="hidden bg-muted lg:grid opacity-85"
                    style={{
                        backgroundImage: `url(${banner})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                    }}
                >
                    <div className="flex flex-col gap-4 p-6 md:p-10">
                        <div className="flex justify-center gap-2 md:justify-start mb-2">
                            <Link
                                to="/"
                                className="flex items-center gap-2 font-bold text-lg"
                            >
                                <img
                                    src={logo}
                                    alt="Logo"
                                    width={30}
                                    height={30}
                                />
                                EatEase
                            </Link>
                        </div>
                        <div className="px-4 py-2 text-foreground font-bold text-2xl flex flex-1 items-center justify-center">
                            <h1 className="px-4 py-2 text-foreground bg-background/90 rounded-md">
                                <TypeAnimation
                                    sequence={[
                                        'Chào mừng đến với EatEase!',
                                        800,
                                        '',
                                        500,
                                    ]}
                                    wrapper="span"
                                    speed={75}
                                    repeat={Infinity}
                                />
                            </h1>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-4 p-6 md:p-10">
                    <div className="lg:hidden flex justify-center gap-2 md:justify-start mb-2">
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
                            <RegisterForm />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
