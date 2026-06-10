export function SkeletonRow({ cols = 5 }) {
  return (
    <tr className="border-b border-dark-700">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton h-4 rounded w-full" />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3">
      <div className="skeleton h-6 rounded w-1/3" />
      <div className="skeleton h-4 rounded w-2/3" />
      <div className="skeleton h-4 rounded w-1/2" />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 6 }) {
  return (
    <div className="card overflow-hidden p-0">
      <table className="w-full">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
