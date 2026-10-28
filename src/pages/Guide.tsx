import { Link } from 'react-router-dom'
import { Check, Formula, Note, Plain, Section, Table, TopicHeader } from '../components/Content'
import { M, MB } from '../components/Math'
import { Stat } from '../components/ui'
import { GROUPS, TOPICS } from '../topics'

type Fx = { name: string; tex: string; note: string; syms: [string, string][] }

const FORMULAS: { group: string; items: Fx[] }[] = [
  {
    group: 'Summaries',
    items: [
      { name: 'Mean', tex: '\\bar{x} = \\frac{1}{N}\\sum_{i=1}^{N} x_i', note: 'The balance point of the values: add them up, divide by how many there are.', syms: [['\\bar{x}', 'the mean'], ['N', 'number of values'], ['x_i', 'the i-th value'], ['\\sum', 'add up over i = 1 to N']] },
      { name: 'Variance (divide by N)', tex: '\\sigma^2 = \\frac{1}{N}\\sum (x_i - \\bar{x})^2 = \\frac{1}{N}\\sum x_i^2 - \\bar{x}^2', note: 'The average squared distance from the mean. Large when values are spread out. The second form is faster by hand.', syms: [['\\sigma^2', 'variance (σ is the standard deviation)'], ['x_i', 'the i-th value'], ['\\bar{x}', 'the mean'], ['N', 'number of values']] },
      { name: 'IQR and outlier fences', tex: 'IQR = Q_3 - Q_1, \\quad [\\,Q_1 - 1.5\\,IQR,\; Q_3 + 1.5\\,IQR\\,]', note: 'The spread of the middle half of the data. Values outside the fences are flagged as outliers.', syms: [['Q_1', 'first quartile: 25% of values are below it'], ['Q_3', 'third quartile: 75% are below it'], ['IQR', 'interquartile range'], ['1.5', 'the usual fence multiplier']] },
    ],
  },
  {
    group: 'Preprocessing',
    items: [
      { name: 'Min-max', tex: "v' = \\frac{v - \\min_A}{\\max_A - \\min_A}(new\\_max - new\\_min) + new\\_min", note: 'Rescales an attribute in a straight line so its smallest value lands on new_min and its largest on new_max, often 0 and 1.', syms: [['v', 'original value'], ["v'", 'rescaled value'], ['\\min_A, \\max_A', 'smallest and largest value of attribute A'], ['new\\_min, new\\_max', 'the target range']] },
      { name: 'z-score', tex: "v' = \\frac{v - \\bar{A}}{\\sigma_A}", note: 'How many standard deviations a value sits above (+) or below (−) the mean.', syms: [['v', 'original value'], ['\\bar{A}', 'mean of attribute A'], ['\\sigma_A', 'standard deviation of A']] },
      { name: 'Pearson correlation', tex: 'r_{A,B} = \\frac{\\sum a_i b_i - N\\bar{A}\\bar{B}}{N\\sigma_A\\sigma_B}', note: 'How strongly two numeric attributes move together along a straight line, from −1 to +1. Close to ±1 means one of them is redundant.', syms: [['r_{A,B}', 'correlation of A and B'], ['a_i, b_i', 'the paired values in record i'], ['N', 'number of records'], ['\\bar{A}, \\bar{B}', 'the two means'], ['\\sigma_A, \\sigma_B', 'the two standard deviations']] },
      { name: 'Chi-square', tex: '\\chi^2 = \\sum_{i,j}\\frac{(o_{ij}-e_{ij})^2}{e_{ij}}, \\quad e_{ij} = \\frac{\\text{row}_i \\times \\text{col}_j}{N}, \\quad df = (r-1)(c-1)', note: 'Compares the observed counts in a contingency table with the counts you would expect if two nominal attributes were independent. A large value means they are related.', syms: [['o_{ij}', 'observed count in cell (i, j)'], ['e_{ij}', 'expected count if independent'], ['\\text{row}_i, \\text{col}_j', 'row and column totals'], ['N', 'total number of records'], ['df', 'degrees of freedom'], ['r, c', 'number of rows and columns']] },
      { name: 'Curse of dimensionality', tex: '\\ell = r^{1/d}', note: 'Edge length of a sub-cube holding a fraction r of evenly spread data. As d grows, ℓ heads to 1, so a "local" neighborhood covers almost the whole range.', syms: [['\\ell', 'edge length of the sub-cube'], ['r', 'fraction of the data inside it'], ['d', 'number of dimensions']] },
      { name: 'PCA variance kept', tex: '\\frac{\\lambda_1 + \\dots + \\lambda_k}{\\lambda_1 + \\dots + \\lambda_d}', note: 'The share of the total variance you keep by keeping only the first k principal components.', syms: [['\\lambda_i', 'variance along component i (its eigenvalue), largest first'], ['k', 'components kept'], ['d', 'all components']] },
    ],
  },
  {
    group: 'Classification',
    items: [
      { name: 'Precision, recall, F1', tex: 'P = \\frac{TP}{TP+FP}, \\quad R = \\frac{TP}{TP+FN}, \\quad F_1 = \\frac{2PR}{P+R}', note: 'Precision: of the records predicted positive, the share that really are. Recall: of the real positives, the share found. F1 is their harmonic mean.', syms: [['TP', 'true positives'], ['FP', 'false positives (false alarms)'], ['FN', 'false negatives (missed)'], ['P, R', 'precision and recall']] },
      { name: 'Entropy', tex: 'Info(D) = -\\sum_{i=1}^{m} p_i \\log_2 p_i', note: 'How mixed the class labels in D are, in bits. 0 when every record has the same class, highest when all classes are equally common.', syms: [['D', 'the set of records'], ['m', 'number of classes'], ['p_i', 'share of records in class i'], ['\\log_2', 'log base 2, so the answer is in bits']] },
      { name: 'Information gain', tex: 'Gain(A) = Info(D) - \\sum_{v} \\frac{|D_v|}{|D|} Info(D_v)', note: 'How much splitting on attribute A lowers the entropy. ID3 splits on the attribute with the highest gain.', syms: [['Info(D)', 'entropy before the split'], ['D_v', 'records where A has value v'], ['|D_v| / |D|', 'weight of that branch'], ['Info(D_v)', 'entropy inside the branch']] },
      { name: 'Gain ratio', tex: 'GainRatio(A) = \\frac{Gain(A)}{SplitInfo_A(D)}', note: 'Gain divided by split information, so attributes with many values (like an ID) do not win just by splitting finely. Used by C4.5.', syms: [['Gain(A)', 'information gain of A'], ['SplitInfo_A(D)', 'entropy of the split itself (next formula)']] },
      { name: 'Split information', tex: 'SplitInfo_A(D) = -\\sum_v \\frac{|D_v|}{|D|}\\log_2\\frac{|D_v|}{|D|}', note: 'The entropy of the branch sizes. Large when A breaks D into many small branches.', syms: [['|D_v| / |D|', 'share of records going down branch v']] },
      { name: 'Bayes rule', tex: 'P(C \\mid X) = \\frac{P(X \\mid C)P(C)}{P(X)}', note: 'Turns "how likely is this record, given the class" into "how likely is the class, given this record".', syms: [['P(C \\mid X)', 'posterior: class probability after seeing X'], ['P(X \\mid C)', 'likelihood of the record within the class'], ['P(C)', 'prior: how common the class is'], ['P(X)', 'evidence: the same for every class, so it can be dropped when comparing']] },
      { name: 'Naive Bayes', tex: 'P(X \\mid C) = \\prod_{k} P(x_k \\mid C)', note: 'Assumes the attributes are independent within each class, so the likelihood becomes a product of one-attribute probabilities.', syms: [['x_k', 'value of attribute k in the record'], ['\\prod_k', 'multiply over all attributes']] },
      { name: 'Laplace correction', tex: 'P(x_k \\mid C) = \\frac{n_{x_k,C} + 1}{n_C + |\\text{values of } A_k|}', note: 'Adds 1 to every count so one unseen value does not make the whole product zero.', syms: [['n_{x_k,C}', 'records in class C with value x_k'], ['n_C', 'records in class C'], ['|\\text{values of } A_k|', 'number of distinct values of attribute k']] },
      { name: 'Minkowski distance', tex: 'd(x, y) = \\Big(\\sum_i |x_i - y_i|^p\\Big)^{1/p}', note: 'Distance between two records. p = 1 is Manhattan, p = 2 is Euclidean, and p → ∞ gives the largest single difference.', syms: [['x_i, y_i', 'attribute i of the two records'], ['p', 'the order of the distance']] },
      { name: 'Perceptron update', tex: 'w_i \\leftarrow w_i + \\alpha (T - O) I_i', note: 'After each training record, nudge every weight in the direction that shrinks the error. Nothing changes when the output is already right.', syms: [['w_i', 'weight of input i'], ['\\alpha', 'learning rate (step size)'], ['T', 'target output'], ['O', 'actual output'], ['I_i', 'input i']] },
    ],
  },
  {
    group: 'Clustering and association',
    items: [
      { name: 'k-means objective', tex: 'SSE = \\sum_{j}\\sum_{x \\in C_j} \\lVert x - m_j \\rVert^2', note: 'Total squared distance from each point to its cluster center. k-means keeps reassigning and recentering to make this smaller.', syms: [['C_j', 'cluster j'], ['m_j', 'its center (the mean)'], ['\\lVert x - m_j \\rVert', 'distance from point x to the center']] },
      { name: 'Silhouette', tex: 's(i) = \\frac{b(i) - a(i)}{\\max\\{a(i), b(i)\\}}', note: 'How well a point fits its own cluster compared with the nearest other one, from −1 to 1. Close to 1 means well placed.', syms: [['a(i)', 'average distance to the other points in its own cluster'], ['b(i)', 'smallest average distance to the points of another cluster']] },
      { name: 'Support and confidence', tex: 'sup(A \\Rightarrow B) = P(A \\cup B), \\quad conf(A \\Rightarrow B) = \\frac{sup(A \\cup B)}{sup(A)}', note: 'Support: how often A and B appear together across all transactions. Confidence: of the transactions with A, the share that also have B.', syms: [['A \\Rightarrow B', 'the rule "if A then B"'], ['A \\cup B', 'transactions containing every item of A and of B'], ['sup(A)', 'share of transactions containing A']] },
      { name: 'Lift', tex: 'lift(A, B) = \\frac{P(A \\cup B)}{P(A)P(B)}', note: 'Confidence compared with how common B is anyway. Above 1: A and B occur together more than chance. 1: independent. Below 1: they tend to exclude each other.', syms: [['P(A \\cup B)', 'share of transactions with both'], ['P(A), P(B)', 'share with each one']] },
    ],
  },
]

function FormulaItem({ it }: { it: Fx }) {
  return (
    <div className="fx" tabIndex={0}>
      <div className="fx-name">{it.name}</div>
      <MB>{it.tex}</MB>
      <div className="fx-more">
        <div>
          <p className="fx-note">{it.note}</p>
          <dl className="fx-syms">
            {it.syms.map(([s, m]) => (
              <div key={s}>
                <dt>
                  <M>{s}</M>
                </dt>
                <dd>{m}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}

export default function Guide() {
  return (
    <div className="page">
      <TopicHeader
        group="Study guide"
        title="How data mining fits together"
        lede="The map of topics, the tools, the mistakes that cost points, and every formula on one sheet."
      />

      <div className="grid c4">
        <Stat k="Topics" v={TOPICS.length} sub={`in ${GROUPS.length} modules`} />
        <Stat k="Preprocessing" v="5 topics" sub="clean, integrate, transform, reduce" />
        <Stat k="Learning" v="2 kinds" sub="supervised and unsupervised" />
        <Stat k="Textbook" v="Han et al." sub="Data Mining: Concepts and Techniques, 3rd ed." />
      </div>

      <Plain title="Data mining in one paragraph">
        <p>
          The topics follow the order of a real project: clean and understand the data, learn from labeled examples (classification), find groups without labels (clustering and outliers), then find items that occur together (association rules).
        </p>
      </Plain>

      <Section id="map" title="Topic map">
        {GROUPS.map((g) => (
          <div key={g} style={{ marginTop: 18 }}>
            <h3 style={{ marginBottom: 10 }}>{g}</h3>
            <Table
              head={['Topic', 'What you learn']}
              rows={TOPICS.filter((t) => t.group === g).map((t) => [<Link key={t.id} to={`/learn/${t.id}`}>{t.title}</Link>, t.blurb])}
            />
          </div>
        ))}
      </Section>

      <Section id="pipeline" title="Which method for which question">
        <Table
          head={['You want to', 'You have', 'Reach for']}
          rows={[
            ['Predict a category', 'Labeled records', <><Link to="/learn/decision-trees">decision tree</Link>, <Link to="/learn/naive-bayes">naive Bayes</Link>, <Link to="/learn/knn">kNN</Link>, <Link to="/learn/neural-networks">neural network</Link></>],
            ['Predict a number', 'Labeled records with a numeric target', <Link to="/learn/regression">regression</Link>],
            ['Find natural groups', 'No labels', <><Link to="/learn/kmeans">k-means</Link>, <Link to="/learn/hierarchical">hierarchical</Link>, <Link to="/learn/dbscan">DBSCAN</Link></>],
            ['Find unusual records', 'No labels, mostly normal data', <Link to="/learn/outliers">outlier detection</Link>],
            ['Find items bought together', 'Transactions (sets of items)', <><Link to="/learn/apriori">Apriori</Link>, <Link to="/learn/fp-growth">FP-growth</Link></>],
            ['Shrink or tidy the data first', 'Messy, wide or redundant columns', <><Link to="/learn/cleaning">cleaning</Link>, <Link to="/learn/transformation">normalization</Link>, <Link to="/learn/reduction">PCA</Link></>],
          ]}
        />
      </Section>

      <Section id="tools" title="Tools">
        <p>Python with Anaconda and JupyterLab, or Google Colab with no install (download your files before the session ends).</p>
        <Table
          head={['Library', 'Used for']}
          rows={[
            [<code>pandas</code>, 'Loading CSV files, duplicates, missing values, group counts, crosstabs'],
            [<code>numpy</code>, 'Arrays, means, standard deviations, linear algebra'],
            [<code>matplotlib</code>, 'Boxplots, histograms, scatter plots, line charts'],
            [<code>scipy.stats</code>, <><code>chi2_contingency</code>, distributions and tests</>],
            [<code>scikit-learn</code>, 'PCA, train/test split, decision trees, naive Bayes, kNN, k-means, metrics'],
          ]}
        />
        <div className="grid c2" style={{ marginTop: 16 }}>
          <Note title="Set up an environment">
            <pre className="code">{`conda create -n dm python=3.12
conda activate dm
conda install pandas numpy matplotlib scipy scikit-learn
conda install -c conda-forge jupyterlab
jupyter lab`}</pre>
          </Note>
          <Note title="Calls you will use again and again">
            <pre className="code">{`df.duplicated()            # repeated rows
df['a'].std(ddof=0)        # population std
df['a'].quantile([.25,.5,.75])
pd.crosstab(df['a'], df['b'])
chi2_contingency(t, correction=False)
PCA().fit(Z).explained_variance_ratio_
DecisionTreeClassifier(criterion='entropy')`}</pre>
          </Note>
        </div>
      </Section>

      <Section id="conventions" title="Mistakes that cost points">
        <ul>
          <li><strong>Standard deviation.</strong> The population formula divides by N, the sample formula by N - 1. pandas uses N - 1 by default (pass <code>ddof=0</code> for N); numpy uses N. Say which one you used.</li>
          <li><strong>Rounding.</strong> If a question asks for 4 decimal places, print with <code>f'{'{'}v:.4f{'}'}'</code>. <code>round()</code> drops trailing zeros (it prints 4.0 instead of 4.0000).</li>
          <li><strong>Row indices.</strong> After dropping rows, keep the original index unless told otherwise. Do not call <code>reset_index</code>.</li>
          <li><strong>Logs.</strong> Entropy uses base 2, so the answer is in bits.</li>
          <li><strong>Significance tests.</strong> State the degrees of freedom, the critical value, and a sentence: reject or do not reject independence.</li>
          <li><strong>Ties.</strong> In k-means or kNN by hand, say how you break a tie.</li>
          <li><strong>Plots.</strong> Title and both axis labels on every chart, and the bin count the question asks for.</li>
        </ul>
      </Section>

      <Section id="formulas" title="Formula sheet">
        <p className="muted">Hover or tap a formula to see what it does and what each symbol means.</p>
        <div className="grid c2">
          {FORMULAS.map((g) => (
            <Formula key={g.group} title={g.group}>
              {g.items.map((it) => (
                <FormulaItem key={it.name} it={it} />
              ))}
            </Formula>
          ))}
        </div>
      </Section>

      <Section id="plan" title="A study loop that works">
        <div className="grid c3">
          <div className="card">
            <span className="label">After each topic</span>
            <h3 style={{ margin: '8px 0' }}>30 minutes</h3>
            <p>Read the topic page. Predict a lab result on paper, then check it.</p>
          </div>
          <div className="card">
            <span className="label">Every week</span>
            <h3 style={{ margin: '8px 0' }}>20 minutes</h3>
            <p>Flashcards for every topic so far. Repeat the ones you miss.</p>
          </div>
          <div className="card">
            <span className="label">Before a test</span>
            <h3 style={{ margin: '8px 0' }}>Daily</h3>
            <p>One practice quiz a day. Redo every wrong calculation by hand.</p>
          </div>
        </div>
      </Section>

      <Section id="textbook" title="Reading alongside: Han, Kamber and Pei (3rd ed.)">
        <Table
          head={['Chapter', 'Matches']}
          rows={[
            ['1 Introduction', <Link to="/learn/intro">What data mining is</Link>],
            ['2 Getting to Know Your Data', <Link to="/learn/summary">Summarizing data</Link>],
            ['3 Data Preprocessing', <Link to="/learn/cleaning">Cleaning, integration, transformation, reduction</Link>],
            ['6 Mining Frequent Patterns, Associations, and Correlations', <Link to="/learn/apriori">Apriori and FP-growth</Link>],
            ['8 Classification: Basic Concepts', <Link to="/learn/decision-trees">Decision trees, Bayes, rules, evaluation</Link>],
            ['9 Classification: Advanced Methods', <Link to="/learn/neural-networks">Neural networks, kNN</Link>],
            ['10 Cluster Analysis: Basic Concepts and Methods', <Link to="/learn/kmeans">k-means, hierarchical, DBSCAN</Link>],
            ['12 Outlier Detection', <Link to="/learn/outliers">Outlier detection</Link>],
          ]}
        />
      </Section>

      <Section id="check" title="Quick self-test">
        <Check q="Classification vs clustering in one sentence?">Classification learns from records whose class is known (supervised); clustering groups records with no class labels (unsupervised).</Check>
        <Check q="Which statistic should you report for a skewed attribute, mean or median?">The median. The mean is pulled toward the long tail.</Check>
        <Check q="What does a chi-square test compare?">
          Observed counts in a contingency table with the counts expected if the two attributes were independent, <M>{'e_{ij} = \\frac{row_i \\times col_j}{N}'}</M>.
        </Check>
      </Section>
    </div>
  )
}
