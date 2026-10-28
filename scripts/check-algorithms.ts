// Checks the algorithms behind the labs against known answers (textbook values and hand-checkable cases).
// Run: npm run check
import { allFrequent, apriori, fpgrowth } from '../src/lib/assoc'
import { kmeans, silhouette } from '../src/lib/cluster'
import { BUYS_COMPUTER, GROCERIES } from '../src/lib/datasets'
import { dbscan, lof } from '../src/lib/density'
import { agglomerate } from '../src/lib/hierarchical'
import { initNet, trainEpoch } from '../src/lib/mlp'
import { chi2Cdf, chi2Critical, eig2, entropy, pearson, quantile } from '../src/lib/stats'
import { evalSplit } from '../src/lib/tree'

let failed = 0
const near = (name: string, got: number, want: number, tol = 1e-3) => {
  const ok = Math.abs(got - want) <= tol
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${got.toFixed(4)} (want ${want})`)
}
const is = (name: string, ok: boolean) => {
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`)
}

// Summaries and statistics
near('median of 1..9', quantile([1, 2, 3, 4, 5, 6, 7, 8, 9], 0.5), 5)
near('pearson of a perfect line', pearson([1, 2, 3, 4], [3, 5, 7, 9]), 1)
const e = eig2(2, 0, 1)
near('eig2 largest eigenvalue', e.l1, 2)
near('eig2 smallest eigenvalue', e.l2, 1)
near('chi-square critical value, alpha 0.001, df 1', chi2Critical(0.001, 1), 10.828, 0.01)
near('chi-square p-value of 507.93, df 1', 1 - chi2Cdf(507.93, 1), 0, 1e-9)
near('chi-square p-value of 3.841, df 1', 1 - chi2Cdf(3.841, 1), 0.05, 1e-3)

// Decision trees: textbook buys_computer gains
near('Info(D) for 9 yes / 5 no', entropy([9, 5]), 0.94, 1e-3)
const classes = ['no', 'yes']
const gain = (a: string) => evalSplit(BUYS_COMPUTER.rows, a, BUYS_COMPUTER.target, classes).gain
near('Gain(age)', gain('age'), 0.2467)
near('Gain(income)', gain('income'), 0.0292)
near('Gain(student)', gain('student'), 0.1518)
near('Gain(credit_rating)', gain('credit_rating'), 0.0481)
near('GainRatio(age)', evalSplit(BUYS_COMPUTER.rows, 'age', BUYS_COMPUTER.target, classes).gainRatio, 0.156)

// Association rules: Apriori and FP-growth must find the same itemsets
const levels = apriori(GROCERIES, 3)
is('Apriori L1 has all 7 items at min count 3', levels[0]?.frequent.length === 7)
is('Apriori L2 has 4 pairs at min count 3', levels[1]?.frequent.length === 4)
const key = (s: string[]) => [...s].sort().join(',')
const a = allFrequent(levels).map((f) => key(f.set) + ':' + f.count).sort()
const f = fpgrowth(GROCERIES, 3).map((x) => key(x.set) + ':' + x.count).sort()
is('FP-growth finds exactly the Apriori itemsets with the same counts', JSON.stringify(a) === JSON.stringify(f))

// Clustering
const blob = (cx: number, cy: number) => [0, 1, 2, 3, 4].map((i) => ({ x: cx + (i % 3) * 0.01, y: cy + Math.floor(i / 3) * 0.01 }))
const two = [...blob(0.2, 0.2), ...blob(0.8, 0.8), { x: 0.5, y: 0.05 }]
const db = dbscan(two, 0.05, 3)
is('DBSCAN finds 2 clusters', db.clusters === 2)
is('DBSCAN marks the far point as noise', db.types[10] === 'noise' && db.labels[10] === -1)
const km = kmeans([...blob(0.2, 0.2), ...blob(0.8, 0.8)], 2, 1)
is('k-means separates two blobs', new Set(km.labels.slice(0, 5)).size === 1 && km.labels[0] !== km.labels[5])
near('silhouette of two far blobs is near 1', silhouette([...blob(0.2, 0.2), ...blob(0.8, 0.8)], km.labels).mean, 0.97, 0.03)
const line = [1, 2, 4, 8, 13].map((x) => ({ x, y: 0 }))
is('single linkage merge heights 1, 2, 4, 5', agglomerate(line, 'single').map((m) => m.h).join(',') === '1,2,4,5')
is('complete linkage merge heights 1, 3, 5, 12', agglomerate(line, 'complete').map((m) => m.h).join(',') === '1,3,5,12')
const scores = lof([...blob(0.2, 0.2), { x: 0.9, y: 0.9 }], 3)
is('LOF: cluster points near 1, the far point clearly higher', scores.slice(0, 5).every((s) => s < 1.5) && scores[5] > 2)

// Neural network: training lowers the loss on XOR
const xor = [
  { x: 0, y: 0, label: 0 },
  { x: 0, y: 1, label: 1 },
  { x: 1, y: 0, label: 1 },
  { x: 1, y: 1, label: 0 },
]
const net = initNet(4, 'tanh', 3)
const first = trainEpoch(net, xor, 0.5, null).loss
let last = first
for (let i = 0; i < 3000; i++) last = trainEpoch(net, xor, 0.5, null).loss
is(`MLP loss falls on XOR (${first.toFixed(3)} -> ${last.toFixed(3)})`, last < first * 0.5)

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed')
process.exit(failed ? 1 : 0)
