import { Link } from 'react-router-dom'
import { Check, Formula, Note, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { M, MB } from '../components/Math'
import { Stat } from '../components/ui'
import { GROUPS, TOPICS } from '../topics'

const FORMULAS: { group: string; items: { name: string; tex: string; note?: string }[] }[] = [
  {
    group: 'Summaries',
    items: [
      { name: 'Mean', tex: '\\bar{x} = \\frac{1}{N}\\sum_{i=1}^{N} x_i' },
      { name: 'Variance (divide by N)', tex: '\\sigma^2 = \\frac{1}{N}\\sum (x_i - \\bar{x})^2 = \\frac{1}{N}\\sum x_i^2 - \\bar{x}^2' },
      { name: 'IQR and outlier fences', tex: 'IQR = Q_3 - Q_1, \\quad [\\,Q_1 - 1.5\\,IQR,\\; Q_3 + 1.5\\,IQR\\,]' },
    ],
  },
  {
    group: 'Preprocessing',
    items: [
      { name: 'Min-max', tex: "v' = \\frac{v - \\min_A}{\\max_A - \\min_A}(new\\_max - new\\_min) + new\\_min" },
      { name: 'z-score', tex: "v' = \\frac{v - \\bar{A}}{\\sigma_A}" },
      { name: 'Pearson correlation', tex: 'r_{A,B} = \\frac{\\sum a_i b_i - N\\bar{A}\\bar{B}}{N\\sigma_A\\sigma_B}' },
      { name: 'Chi-square', tex: '\\chi^2 = \\sum_{i,j}\\frac{(o_{ij}-e_{ij})^2}{e_{ij}}, \\quad e_{ij} = \\frac{\\text{row}_i \\times \\text{col}_j}{N}, \\quad df = (r-1)(c-1)' },
      { name: 'Curse of dimensionality', tex: '\\ell = r^{1/d}' },
      { name: 'PCA variance kept', tex: '\\frac{\\lambda_1 + \\dots + \\lambda_k}{\\lambda_1 + \\dots + \\lambda_d}' },
    ],
  },
  {
    group: 'Classification',
    items: [
      { name: 'Precision, recall, F1', tex: 'P = \\frac{TP}{TP+FP}, \\quad R = \\frac{TP}{TP+FN}, \\quad F_1 = \\frac{2PR}{P+R}' },
      { name: 'Entropy', tex: 'Info(D) = -\\sum_{i=1}^{m} p_i \\log_2 p_i' },
      { name: 'Information gain', tex: 'Gain(A) = Info(D) - \\sum_{v} \\frac{|D_v|}{|D|} Info(D_v)' },
      { name: 'Gain ratio', tex: 'GainRatio(A) = \\frac{Gain(A)}{SplitInfo_A(D)}, \\; SplitInfo_A(D) = -\\sum_v \\frac{|D_v|}{|D|}\\log_2\\frac{|D_v|}{|D|}' },
      { name: 'Bayes rule', tex: 'P(C \\mid X) = \\frac{P(X \\mid C)P(C)}{P(X)}' },
      { name: 'Naive Bayes', tex: 'P(X \\mid C) = \\prod_{k} P(x_k \\mid C)' },
      { name: 'Laplace correction', tex: 'P(x_k \\mid C) = \\frac{n_{x_k,C} + 1}{n_C + |\\text{values of } A_k|}' },
      { name: 'Minkowski distance', tex: 'd(x, y) = \\Big(\\sum_i |x_i - y_i|^p\\Big)^{1/p}' },
      { name: 'Perceptron update', tex: 'w_i \\leftarrow w_i + \\alpha (T - O) I_i' },
    ],
  },
  {
    group: 'Clustering and association',
    items: [
      { name: 'k-means objective', tex: 'SSE = \\sum_{j}\\sum_{x \\in C_j} \\lVert x - m_j \\rVert^2' },
      { name: 'Silhouette', tex: 's(i) = \\frac{b(i) - a(i)}{\\max\\{a(i), b(i)\\}}' },
      { name: 'Support and confidence', tex: 'sup(A \\Rightarrow B) = P(A \\cup B), \\quad conf(A \\Rightarrow B) = \\frac{sup(A \\cup B)}{sup(A)}' },
      { name: 'Lift', tex: 'lift(A, B) = \\frac{P(A \\cup B)}{P(A)P(B)}' },
    ],
  },
]

export default function Course() {
  return (
    <div className="page">
      <TopicHeader
        group="Course guide"
        title="COMP 4331 Introduction to Data Mining"
        lede="What the course covers, how it is graded, the tools, the conventions that cost marks, and every formula on one sheet."
      />

      <div className="grid c4">
        <Stat k="Assignments" v="20%" sub="2 coding assignments" />
        <Stat k="Quizzes" v="20%" sub="2 in-class quizzes" />
        <Stat k="Final exam" v="60%" sub="must attend to pass" />
        <Stat k="Textbook" v="Han et al." sub="Data Mining: Concepts and Techniques, 3rd ed." />
      </div>

      <Plain title="The course in one paragraph">
        <p>
          The course follows the order of a real project: clean and understand the data, learn from labeled examples (classification), find groups without labels (clustering and outliers), then find items that occur together (association rules).
        </p>
      </Plain>

      <Section id="map" title="Course map">
        {GROUPS.map((g) => (
          <div key={g} style={{ marginTop: 18 }}>
            <h3 style={{ marginBottom: 10 }}>{g}</h3>
            <Table
              head={['Topic', 'What you learn', 'Lecture']}
              rows={TOPICS.filter((t) => t.group === g).map((t) => [<Link to={`/learn/${t.id}`}>{t.title}</Link>, t.blurb, t.lecture ?? 'Later'])}
            />
          </div>
        ))}
      </Section>

      <Section id="assessment" title="How you are assessed">
        <Table
          head={['Component', 'Weight', 'What it tests', 'How to prepare']}
          rows={[
            ['2 assignments', '20%', 'Python notebooks on real data: cleaning, plots, statistics, PCA, classifiers', 'Follow the conventions line exactly. Every number in the right format, every plot labeled.'],
            ['2 quizzes', '20%', 'Short concept and calculation questions on recent lectures', 'Flashcards plus the practice quiz for the covered topics.'],
            ['Final exam', '60%', 'All topics. Calculations by hand and explanations.', 'Work the labs in exam mode: predict the result, then check it with the lab.'],
          ]}
        />
        <Trap title="Rules worth knowing">
          <ul>
            <li>Missing the final exam means failing the course.</li>
            <li>Plagiarism gives zero to every party involved. Discuss ideas, never share code or answers.</li>
            <li>Late assignments lose marks for every 24 hours past the deadline.</li>
          </ul>
        </Trap>
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

      <Section id="conventions" title="Conventions that cost marks">
        <ul>
          <li><strong>Standard deviation.</strong> The course divides by N. pandas divides by N - 1 by default, so pass <code>ddof=0</code>. numpy already divides by N.</li>
          <li><strong>Rounding.</strong> If a question asks for 4 decimal places, print with <code>f'{'{'}v:.4f{'}'}'</code>. <code>round()</code> drops trailing zeros (it prints 4.0 instead of 4.0000).</li>
          <li><strong>Row indices.</strong> After dropping rows, keep the original index unless told otherwise. Do not call <code>reset_index</code>.</li>
          <li><strong>Logs.</strong> Entropy uses base 2, so the answer is in bits.</li>
          <li><strong>Significance tests.</strong> State the degrees of freedom, the critical value, and a sentence: reject or do not reject independence.</li>
          <li><strong>Ties.</strong> In k-means or kNN by hand, say how you break a tie.</li>
          <li><strong>Plots.</strong> Title and both axis labels on every chart, and the bin count the question asks for.</li>
        </ul>
      </Section>

      <Section id="formulas" title="Formula sheet">
        <div className="grid c2">
          {FORMULAS.map((g) => (
            <Formula key={g.group} title={g.group}>
              {g.items.map((it) => (
                <div key={it.name} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{it.name}</div>
                  <MB>{it.tex}</MB>
                </div>
              ))}
            </Formula>
          ))}
        </div>
      </Section>

      <Section id="plan" title="A study loop that works">
        <div className="grid c3">
          <div className="card">
            <span className="label">After each lecture</span>
            <h3 style={{ margin: '8px 0' }}>30 minutes</h3>
            <p>Read the topic page. Predict a lab result on paper, then check it.</p>
          </div>
          <div className="card">
            <span className="label">Every week</span>
            <h3 style={{ margin: '8px 0' }}>20 minutes</h3>
            <p>Flashcards for every topic so far. Repeat the ones you miss.</p>
          </div>
          <div className="card">
            <span className="label">Two weeks before the exam</span>
            <h3 style={{ margin: '8px 0' }}>Daily</h3>
            <p>One practice quiz a day. Redo every wrong calculation by hand.</p>
          </div>
        </div>
      </Section>

      <Section id="textbook" title="Textbook chapters (Han, Kamber and Pei, 3rd ed.)">
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
