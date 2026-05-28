import React from 'react';

import {
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import NoData from './NoData';

const DisplayTable = ({ data, column }) => {
    const table = useReactTable({
        data: data || [],
        columns: column,
        getCoreRowModel: getCoreRowModel(),
    });

    if (!data || data.length === 0) {
        return <NoData />;
    }

    return (
        <div className="p-2">
            <table className="w-full px-0 py-0 border-collapse">
                <thead className="bg-blue-950 text-white">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                            <th className="border py-2">Sr.No</th>
                            {headerGroup.headers.map((header) => (
                                <th
                                    key={header.id}
                                    className="border py-2 whitespace-nowrap"
                                >
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                              header.column.columnDef.header,
                                              header.getContext()
                                          )}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {table.getRowModel().rows.map((row, index) => (
                        <tr key={row.id}>
                            <td className="text-center border px-2 py-1">
                                {index + 1}
                            </td>
                            {row.getVisibleCells().map((cell) => (
                                <td
                                    key={cell.id}
                                    className={`border px-2 py-1 whitespace-nowrap ${
                                        cell.column.columnDef.meta?.className ||
                                        ''
                                    }`}
                                >
                                    {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="h-4" />
        </div>
    );
};

export default DisplayTable;
