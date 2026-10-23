import { useMemo, useState } from 'react'
import { Check, Formula, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { M } from '../components/Math'
import { Btn, Readout, Seg, Slider, Stat, Toggle } from '../components/ui'
import { GROCERIES } from '../lib/datasets'
import { allFrequent, apriori, buildTree, condTree, fpgrowth, headerOrder, key, orderTx, patternBase, show } from '../lib/e-assoc'
import { TreeView, TxEditor } from '../lib/e-ui'

const pct = (v: number) => `${Math.round(v * 100)}%`
const DEFAULT = GROCERIES.map((t) => [...t].sort())

function OrderLab({ tx, minSup, setMinSup }: { tx: string[][]; minSup: number; setMinSup: (v: number) => void }) {
  const minCount = Math.max(1, Math.ceil(minSup * tx.length - 1e-9))
  const header = headerOrder(tx, minCount)
  const order = header.map(([i]) => i)
  const dropped = [...new Set(tx.flat())].filter((i) => !order.includes(i)).sort()
  return (
    <Lab
      title="Scan 1: count items, then reorder every transaction"
      desc="The first scan counts single items. Infrequent items are dropped, and each transaction is rewritten in descending order of item count."
      controls={<Slider label="min_sup" value={minSup} min={0.1} max={0.8} step={0.05} fmt={(v) => `${pct(v)} (count ${Math.max(1, Math.ceil(v * tx.length - 1e-9))})`} onChange={setMinSup} />}
      notes={[
        'Sorting by count puts the most common items near the root, so many transactions share the same first branches. That sharing is what makes the tree small.',
        'Ties are broken alphabetically here. Any fixed rule works, as long as every transaction uses the same order.',
      ]}
    >
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', alignItems: 'start' }}>
        <div style={{ maxWidth: 260 }}>
          <span className="label">Header table (L1 in frequency order)</span>
          <div style={{ marginTop: 8 }}>
            <Table head={['Item', 'Count']} num={[1]} rows={header.map(([i, c]) => [i, c])} />
          </div>
          {dropped.length > 0 && <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Dropped as infrequent: {dropped.join(', ')}</p>}
        </div>
        <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
          <span className="label">Transactions after reordering</span>
          <div style={{ marginTop: 8 }}>
            <Table head={['TID', 'Original', 'Ordered frequent items']} rows={tx.map((t, i) => [`T${i + 1}`, t.join(', '), orderTx(t, order).join(', ') || 'nothing left'])} />
          </div>
        </div>
      </div>
      <Readout>
        <Stat k="min count" v={minCount} />
        <Stat k="Frequent items" v={order.length} />
        <Stat k="Dropped items" v={dropped.length} />
      </Readout>
    </Lab>
  )
}

function BuildLab({ tx, minSup }: { tx: string[][]; minSup: number }) {
  const minCount = Math.max(1, Math.ceil(minSup * tx.length - 1e-9))
  const order = headerOrder(tx, minCount).map(([i]) => i)
  const ordered = tx.map((t) => orderTx(t, order))
  const [step, setStep] = useState(tx.length)
  const [links, setLinks] = useState(true)
  const s = Math.min(step, tx.length)
  const tree = useMemo(() => buildTree(ordered.slice(0, s).filter((t) => t.length).map((items) => ({ items, count: 1 }))), [tx, minCount, s])
  const last = s > 0 ? ordered[s - 1] : []
  const hl = new Set<number>()
  let cur = 0
  last.forEach((it) => {
    const nxt = tree.nodes[cur].children.find((id) => tree.nodes[id].item === it)
    if (nxt !== undefined) {
      hl.add(nxt)
      cur = nxt
    }
  })
  const shared = tx.reduce((acc, _, i) => acc + ordered[i].length, 0)
  return (
    <Lab
      title="Scan 2: grow the FP-tree"
      desc="Insert the reordered transactions one at a time. A transaction walks down the existing branch as long as its items match, adding 1 to each count, and starts a new branch at the first difference."
      controls={
        <>
          <Slider label="Transactions inserted" value={s} min={0} max={tx.length} onChange={setStep} fmt={(v) => `${v} of ${tx.length}`} />
          <div className="row">
            <Btn sm onClick={() => setStep((v) => Math.max(0, Math.min(v, tx.length) - 1))} disabled={s === 0}>Back</Btn>
            <Btn sm variant="primary" onClick={() => setStep((v) => Math.min(tx.length, v + 1))} disabled={s >= tx.length}>Insert next</Btn>
          </div>
          <Toggle on={links} onChange={setLinks}>Show node-links (dashed)</Toggle>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            {s > 0 ? `Last inserted: T${s} = ${last.join(', ') || 'no frequent items'}. Its path is outlined.` : 'Start from the empty root, labeled null.'}
          </p>
        </>
      }
      notes={[
        'Step through T1 to T4. T4 shares its first items with earlier baskets, so it only increases counts on an existing branch instead of making new nodes.',
        'Node-links join every node holding the same item. The header table points to the first one, so the miner can visit all of them without searching the tree.',
        'A count on a node is how many transactions pass through it, not how many contain the item overall. Add up an item over its node-links to get the overall count.',
      ]}
    >
      <TreeView nodes={tree.nodes} links={tree.links} order={order} highlight={hl} showLinks={links} label="FP-tree" />
      <Readout>
        <Stat k="Tree nodes" v={tree.nodes.length - 1} sub="excluding the root" />
        <Stat k="Items in data" v={shared} sub="after dropping infrequent" />
        <Stat k="Compression" v={shared ? `${Math.round((1 - (tree.nodes.length - 1) / Math.max(1, ordered.slice(0, s).reduce((a, t) => a + t.length, 0))) * 100)}%` : '-'} sub="items stored as shared nodes" />
      </Readout>
    </Lab>
  )
}

function MineLab({ tx, minSup }: { tx: string[][]; minSup: number }) {
  const minCount = Math.max(1, Math.ceil(minSup * tx.length - 1e-9))
  const order = headerOrder(tx, minCount).map(([i]) => i)
  const tree = useMemo(() => buildTree(tx.map((t) => orderTx(t, order)).filter((t) => t.length).map((items) => ({ items, count: 1 }))), [tx, minCount])
  const [pick, setPick] = useState<string>('')
  const item = order.includes(pick) ? pick : order[order.length - 1] ?? ''
  const base = item ? patternBase(tree.nodes, tree.links.get(item) ?? []) : []
  const ct = condTree(base, minCount)
  const fp = useMemo(() => fpgrowth(tx, minCount), [tx, minCount])
  const ap = useMemo(() => allFrequent(apriori(tx, minCount)), [tx, minCount])
  const same = JSON.stringify(fp.map((f) => key(f.set) + f.count).sort()) === JSON.stringify(ap.map((f) => key(f.set) + f.count).sort())
  const above = order.slice(0, order.indexOf(item))
  const mine = fp.filter((f) => f.set.includes(item) && f.set.every((i) => i === item || above.includes(i)))
  return (
    <Lab
      title="Mining: conditional pattern base and conditional FP-tree"
      desc="Pick an item. Collect the prefix paths that lead to it (its conditional pattern base), build a small FP-tree from those paths, and mine that tree recursively."
      controls={
        <>
          <Seg label="Suffix item" value={item} onChange={setPick} options={order.map((i) => ({ v: i, label: i }))} />
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            FP-growth processes items from the bottom of the header table upward. Each item only combines with items above it, so no itemset is found twice.
          </p>
        </>
      }
      notes={[
        'Start with the bottom item. Its paths are short and few, so its conditional tree is tiny.',
        'Counts in the pattern base come from the item node at the end of each path, not from the nodes on the path.',
        'Change the baskets at the top of the page: the readout keeps checking that FP-growth and Apriori find exactly the same frequent itemsets.',
      ]}
    >
      {item ? (
        <>
          <div className="grid c2">
            <div>
              <span className="label">Conditional pattern base of {item}</span>
              <div style={{ marginTop: 8 }}>
                <Table head={['Prefix path', 'Count']} num={[1]} rows={base.length ? base.map((b) => [show(b.items), b.count]) : [['no prefix paths (it sits right under the root)', '']]} />
              </div>
              <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                Item counts in this base: {[...ct.counts.entries()].map(([i, c]) => `${i} ${c}`).join(', ') || 'none'}. Kept (count at least {minCount}): {ct.order.join(', ') || 'none'}.
              </p>
            </div>
            <div>
              <span className="label">Frequent itemsets ending in {item}</span>
              <div style={{ marginTop: 8 }}>
                <Table head={['Itemset', 'Count']} num={[1]} rows={mine.map((f) => [show(f.set), f.count])} />
              </div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <span className="label">Conditional FP-tree of {item}</span>
            {ct.nodes.length > 1 ? <TreeView nodes={ct.nodes} links={ct.links} order={order} showLinks={false} label={`Conditional FP-tree for ${item}`} /> : <p className="muted">Empty: no item in the pattern base is frequent, so {item} only forms the single itemset {'{'}{item}{'}'}.</p>}
          </div>
        </>
      ) : (
        <p className="muted">No frequent items at this min_sup.</p>
      )}
      <Readout>
        <Stat k="FP-growth sets" v={fp.length} />
        <Stat k="Apriori sets" v={ap.length} />
        <Stat k="Same result" v={same ? 'yes' : 'no'} sub="itemsets and counts" />
      </Readout>
    </Lab>
  )
}

function Worked() {
  const minCount = 3
  const order = headerOrder(DEFAULT, minCount).map(([i]) => i)
  const tree = buildTree(DEFAULT.map((t) => orderTx(t, order)).filter((t) => t.length).map((items) => ({ items, count: 1 })))
  const base = patternBase(tree.nodes, tree.links.get('cola') ?? [])
  const ct = condTree(base, minCount)
  return (
    <>
      <p>Default baskets, min_sup = 30% (count 3). Mine the item at the bottom of the header table, cola.</p>
      <ol>
        <li>Header order after scan 1: {order.join(', ')}.</li>
        <li>
          Prefix paths ending at cola: {base.map((b) => `${show(b.items)}: ${b.count}`).join(', ')}.
        </li>
        <li>
          Counts inside this base: {[...ct.counts.entries()].map(([i, c]) => `${i} ${c}`).join(', ')}. Only {ct.order.join(', ')} reaches 3.
        </li>
        <li>The conditional FP-tree is a single node {ct.order[0]}: 3, so the frequent itemsets ending in cola are {'{'}cola{'}'}: 3 and {'{'}cola, diapers{'}'}: 3.</li>
      </ol>
      <p>That matches Apriori, which found {'{'}cola, diapers{'}'} in L2 and nothing larger containing cola.</p>
    </>
  )
}

export default function Page() {
  const [tx, setTx] = useState<string[][]>(DEFAULT)
  const [minSup, setMinSup] = useState(0.3)
  return (
    <>
      <TopicHeader group="Association" title="FP-growth" lede="FP-growth finds the same frequent itemsets as Apriori without generating any candidates. It squeezes the database into a compact tree, then mines the tree piece by piece." minutes={25} />

      <Plain>
        <p>
          Think of the autocomplete tree in your phone contacts. Names that start the same way share the same first letters in the tree, and only branch where they differ. FP-growth does the same with shopping baskets: baskets that start with the same popular items share a branch, and each branch keeps a counter of how many baskets went through it.
        </p>
        <p>
          Once all baskets are in the tree, you never touch the raw data again. To find everything that goes with cola, you only look at the branches that end in cola.
        </p>
      </Plain>

      <Section id="idea" title="Two scans, no candidates" kicker="How it works">
        <ol>
          <li>
            <strong>Scan 1</strong>: count every item. Keep the frequent ones, sorted by descending count (the header table).
          </li>
          <li>
            <strong>Scan 2</strong>: insert every transaction, reordered by the header table, into the FP-tree. Shared prefixes share nodes.
          </li>
          <li>
            <strong>Mine</strong>: for each item from the bottom of the header table up, build its <strong>conditional pattern base</strong> (the prefix paths that end in it, each with that node's count), build a <strong>conditional FP-tree</strong> from it, and recurse. Every frequent pattern found in the conditional tree gets the item appended.
          </li>
        </ol>
        <Formula title="Why the results are correct">
          <p>
            Every transaction containing item <M>{'a'}</M> passes through exactly one <M>{'a'}</M> node, so summing the counts over the node-links of <M>{'a'}</M> gives <M>{'count(a)'}</M>. The prefix path above each <M>{'a'}</M> node lists exactly the more frequent items bought with <M>{'a'}</M> in those transactions. So the support of <M>{'X \\cup \\{a\\}'}</M> in the full data equals the support of <M>{'X'}</M> in the conditional pattern base of <M>{'a'}</M>.
          </p>
        </Formula>
      </Section>

      <TxEditor tx={tx} onChange={setTx} reset={() => setTx(DEFAULT)} />

      <OrderLab tx={tx} minSup={minSup} setMinSup={setMinSup} />
      <BuildLab key={tx.length} tx={tx} minSup={minSup} />
      <MineLab tx={tx} minSup={minSup} />

      <Section id="worked" title="Worked example" kicker="Exam style">
        <Worked />
      </Section>

      <Section id="compare" title="Apriori vs FP-growth" kicker="Know these cold">
        <Table
          head={['', 'Apriori', 'FP-growth']}
          rows={[
            ['Search', 'Level-wise, breadth first', 'Divide and conquer, one suffix item at a time'],
            ['Candidates', 'Generated and counted at every level', 'None'],
            ['Database scans', 'One per level', 'Two'],
            ['Memory', 'Candidate sets', 'The FP-tree, which can be large when transactions share little'],
            ['Best when', 'Data is sparse and min_sup is high', 'Data is dense or min_sup is low (long patterns)'],
            ['Output', 'All frequent itemsets', 'Exactly the same itemsets and counts'],
          ]}
        />
        <Trap>
          <ul>
            <li>Order items by <strong>descending</strong> count before inserting. Using a different order gives a valid but bigger tree, and the exam answer will not match.</li>
            <li>Remove infrequent items from every transaction before inserting it.</li>
            <li>In a conditional pattern base, each prefix path gets the count of the suffix node at its end.</li>
            <li>Drop items below min_sup inside the conditional pattern base before building the conditional tree.</li>
          </ul>
        </Trap>
      </Section>

      <Section id="check" title="Check yourself">
        <Check q="How many times does FP-growth read the original database?">
          Twice. Once to count items and build the header table, once to insert the reordered transactions into the tree. All mining happens on the tree.
        </Check>
        <Check q="An item e has three nodes with counts 2, 1 and 1. What is count(e)?">
          4. Each transaction containing e passes through exactly one e node, so you add the counts along e's node-links.
        </Check>
        <Check q="If a conditional FP-tree is a single path, how do you finish quickly?">
          Every combination of the nodes on that path is frequent. Each combination joined with the suffix is a frequent pattern, and its count is the smallest count among the chosen nodes.
        </Check>
      </Section>
    </>
  )
}
