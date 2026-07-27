/* ============================================================
   TBS — Hungarian Algorithm (Kuhn-Munkres Bipartite Matching)
   O(N^3) optimal assignment solver for scheduled batch dispatch
   ============================================================ */

/**
 * Solve the Minimum Weight Bipartite Matching problem using the Hungarian algorithm.
 * Input: Cost Matrix `costMatrix` of size N x M (N workers/drivers, M jobs/guests).
 * Returns array of assignments: `assignments[workerIdx] = jobIdx` (-1 if unassigned).
 */
export function solveHungarianBipartiteMatching(costMatrix: number[][]): {
  assignments: number[];
  totalCost: number;
} {
  const n = costMatrix.length;
  if (n === 0) return { assignments: [], totalCost: 0 };
  const m = costMatrix[0].length;
  if (m === 0) return { assignments: Array(n).fill(-1), totalCost: 0 };

  // Convert non-square matrix to square NxN matrix by padding with large numbers if needed
  const dim = Math.max(n, m);
  const matrix: number[][] = Array(dim)
    .fill(0)
    .map((_, r) =>
      Array(dim)
        .fill(0)
        .map((_, c) => (r < n && c < m ? costMatrix[r][c] : 1e9))
    );

  const u = Array(dim + 1).fill(0);
  const v = Array(dim + 1).fill(0);
  const p = Array(dim + 1).fill(0);
  const way = Array(dim + 1).fill(0);

  for (let i = 1; i <= dim; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = Array(dim + 1).fill(Infinity);
    const used = Array(dim + 1).fill(false);

    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;

      for (let j = 1; j <= dim; j++) {
        if (!used[j]) {
          const cur = matrix[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }

      for (let j = 0; j <= dim; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  // Extract assignment mapping: workerIdx -> jobIdx
  const workerAssignment = Array(n).fill(-1);
  let totalCost = 0;

  for (let j = 1; j <= dim; j++) {
    const workerIdx = p[j] - 1;
    const jobIdx = j - 1;

    if (workerIdx >= 0 && workerIdx < n && jobIdx < m) {
      const origCost = costMatrix[workerIdx][jobIdx];
      if (origCost < 1e8) {
        workerAssignment[workerIdx] = jobIdx;
        totalCost += origCost;
      }
    }
  }

  return {
    assignments: workerAssignment,
    totalCost,
  };
}
