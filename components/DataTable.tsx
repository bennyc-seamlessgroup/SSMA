import type { ReactNode } from 'react';
export function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) { return <table className="table"><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table>; }
