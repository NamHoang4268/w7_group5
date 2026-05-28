import React from 'react';

const RequiredField = ({ id, label, required, ...props }) => {
    return (
        <div className="grid gap-2">
            <label id={id} htmlFor={id} className="font-semibold">
                {label} ({required && <span className="text-red-500">*</span>})
            </label>
            <input
                id={id}
                {...props}
                className={`bg-blue-50 p-2 border rounded outline-none
                        focus-within:border-primary-200 ${
                            props.className || ''
                        }`}
            />
        </div>
    );
};

export default RequiredField;
