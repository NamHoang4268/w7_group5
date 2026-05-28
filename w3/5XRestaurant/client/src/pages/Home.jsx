import React from 'react';
import { ModernEpicureanHome } from '../components/home/ModernEpicureanHome';

const Home = () => {
    return <ModernEpicureanHome />;
    // {/* Display Category Product */}
    // <section className="py-12">
    //     <div className="container mx-auto px-4">
    //         <div className="text-center mb-10">
    //             <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
    //                 Thực Đơn Của Chúng Tôi
    //             </h2>
    //             <p className="text-foreground/80 max-w-2xl mx-auto">
    //                 Khám phá các món ăn đa dạng, được chế biến từ
    //                 nguyên liệu tươi ngon
    //             </p>
    //         </div>

    //         <div className="flex flex-col gap-12">
    //             {categoryData?.map((c, index) => {
    //                 return (
    //                     <CategoryWiseProductDisplay
    //                         key={
    //                             c?._id + 'CategoryWiseProduct' ||
    //                             index
    //                         }
    //                         id={c?._id}
    //                         name={c?.name}
    //                     />
    //                 );
    //             })}
    //         </div>
    //     </div>
    // </section>
};

export default Home;
