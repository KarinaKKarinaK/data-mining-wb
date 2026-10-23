import { BUYS_COMPUTER, GROCERIES } from '../lib/datasets'
import { entropy, gini, mean, median, minkowski, pearson, quantile, std } from '../lib/stats'

export type Question = {
  id: string
  topic: string
  type: 'mc' | 'tf' | 'num'
  q: string
  options?: string[]
  answer: number
  tol?: number
  explain: string
}

const f = (v: number, d = 3) => v.toFixed(d)
let n = 0
const mc = (topic: string, q: string, options: string[], answer: number, explain: string): Question => ({ id: `q${n++}`, topic, type: 'mc', q, options, answer, explain })
const tf = (topic: string, q: string, isTrue: boolean, explain: string): Question => ({ id: `q${n++}`, topic, type: 'tf', q, options: ['True', 'False'], answer: isTrue ? 0 : 1, explain })
const num = (topic: string, q: string, answer: number, explain: string, tol = 0.005): Question => ({ id: `q${n++}`, topic, type: 'num', q, answer, tol, explain })

const rows = BUYS_COMPUTER.rows
const cls = (rs: typeof rows) => [rs.filter((r) => r.buys_computer === 'yes').length, rs.filter((r) => r.buys_computer === 'no').length]
const gainOf = (attr: string) => {
  const vals = [...new Set(rows.map((r) => r[attr]))]
  const after = vals.reduce((s, v) => {
    const part = rows.filter((r) => r[attr] === v)
    return s + (part.length / rows.length) * entropy(cls(part))
  }, 0)
  return entropy(cls(rows)) - after
}
const splitInfo = (attr: string) => entropy([...new Set(rows.map((r) => r[attr]))].map((v) => rows.filter((r) => r[attr] === v).length))
const nbScore = (c: string, x: Record<string, string>) => {
  const inC = rows.filter((r) => r.buys_computer === c)
  return Object.entries(x).reduce((p, [k, v]) => p * (inC.filter((r) => r[k] === v).length / inC.length), inC.length / rows.length)
}
const X = { age: 'youth', income: 'medium', student: 'yes', credit_rating: 'fair' }

const sup = (items: string[]) => GROCERIES.filter((t) => items.every((i) => t.includes(i))).length / GROCERIES.length

const chiTable = [
  [250, 200],
  [50, 1000],
]
const chi = (() => {
  const N = chiTable.flat().reduce((a, b) => a + b, 0)
  const rs = chiTable.map((r) => r[0] + r[1])
  const cs = [chiTable[0][0] + chiTable[1][0], chiTable[0][1] + chiTable[1][1]]
  let s = 0
  chiTable.forEach((r, i) => r.forEach((o, j) => {
    const e = (rs[i] * cs[j]) / N
    s += (o - e) ** 2 / e
  }))
  return s
})()

const rx = [1, 2, 3, 4, 5]
const ry = [2, 4, 5, 4, 5]

const lx = [1, 2, 3]
const ly = [2, 4, 5]
const lxm = mean(lx)
const lym = mean(ly)
const slope = lx.reduce((s, x, i) => s + (x - lxm) * (ly[i] - lym), 0) / lx.reduce((s, x) => s + (x - lxm) ** 2, 0)
const icpt = lym - slope * lxm
const sseR = lx.reduce((s, x, i) => s + (ly[i] - (icpt + slope * x)) ** 2, 0)
const sstR = ly.reduce((s, y) => s + (y - lym) ** 2, 0)

const sig = (z: number) => 1 / (1 + Math.exp(-z))

const prec = 90 / (90 + 140)
const rec = 90 / (90 + 210)

export const QUESTIONS: Question[] = [
  mc('intro', 'Which of these is NOT data mining?', ['Grouping customers by purchase behavior', 'Looking up a phone number in a directory', 'Predicting which loans will default', 'Finding items often bought together'], 1, 'A lookup returns a fact you asked for. Data mining discovers patterns you did not know about.'),
  mc('intro', 'Spotify groups listeners by tempo, skip rate and listening hours without any labels. Which task is this?', ['Classification', 'Regression', 'Clustering', 'Association analysis'], 2, 'No labels and grouping by similarity: that is clustering.'),
  mc('intro', 'A bank labels past transactions as fraud or legitimate and trains a model on them. Which task?', ['Classification', 'Clustering', 'Association analysis', 'Outlier detection without labels'], 0, 'Known categorical labels and a model to predict them: classification.'),
  mc('intro', 'Predicting tomorrow\'s temperature in degrees is which task?', ['Classification', 'Regression', 'Clustering', 'Association'], 1, 'The target is a number, so it is regression.'),
  tf('intro', 'Clustering is a supervised learning task.', false, 'Clustering has no class labels, so it is unsupervised.'),
  mc('intro', 'Daily closing prices of a stock form what kind of data?', ['Transactional', 'Graph', 'Time series', 'Spatial'], 2, 'Repeated measurements over regular time steps are a time series.'),
  tf('intro', 'In the KDD process, data cleaning and integration come before the mining step.', true, 'Preprocessing prepares the data. Mining runs on the cleaned, integrated, selected and transformed data.'),

  num('summary', 'Data: 2, 4, 4, 4, 5, 5, 7, 9. What is the mean?', mean([2, 4, 4, 4, 5, 5, 7, 9]), 'Sum is 40, N is 8, so the mean is 5.'),
  num('summary', 'Data: 2, 4, 4, 4, 5, 5, 7, 9. What is the standard deviation (divide by N)?', std([2, 4, 4, 4, 5, 5, 7, 9]), 'Squared deviations from 5: 9, 1, 1, 1, 0, 0, 4, 16. Sum 32, divided by 8 gives variance 4, so the std is 2.'),
  num('summary', 'Median of 1, 6, 2, 8, 7, 2?', median([1, 6, 2, 8, 7, 2]), 'Sorted: 1, 2, 2, 6, 7, 8. Even count, so average the two middle values: (2 + 6) / 2 = 4.'),
  num('summary', 'Data: 0, 4, 5, 6, 7, 7, 8, 10, 11, 18. What is the 10% trimmed mean?', mean([4, 5, 6, 7, 7, 8, 10, 11]), 'Drop the lowest (0) and highest (18) value, then average the other 8: 58 / 8 = 7.25.'),
  num('summary', 'Data 1 to 9. With linear interpolation Q1 = 3 and Q3 = 7. What is the upper outlier fence?', quantile([1, 2, 3, 4, 5, 6, 7, 8, 9], 0.75) + 1.5 * (quantile([1, 2, 3, 4, 5, 6, 7, 8, 9], 0.75) - quantile([1, 2, 3, 4, 5, 6, 7, 8, 9], 0.25)), 'IQR = 7 - 3 = 4. Upper fence = Q3 + 1.5 x IQR = 7 + 6 = 13.'),
  mc('summary', 'In a right-skewed distribution, which order is typical?', ['mean < median < mode', 'mode < median < mean', 'median < mode < mean', 'all equal'], 1, 'The long right tail pulls the mean up the most, the median less, the mode not at all.'),
  tf('summary', 'Two datasets with the same boxplot must have the same distribution.', false, 'A boxplot only keeps five numbers. Different shapes can share them, which a histogram would show.'),

  num('cleaning', 'Sorted prices 4, 8, 15, 21, 21, 24, 25, 28, 34 go into 3 equal-depth bins. Smoothing by bin means: what value replaces 24?', mean([21, 21, 24]), 'The second bin is {21, 21, 24}. Its mean is 22.'),
  num('cleaning', 'Same bins. Smoothing by bin boundaries: what value replaces 28 in the bin {25, 28, 34}?', 25, '28 is 3 away from 25 and 6 away from 34, so it takes the closer boundary, 25.'),
  num('cleaning', 'Equal-width binning of the range 0 to 100 into 5 bins. How wide is each bin?', 20, '(100 - 0) / 5 = 20.'),
  mc('cleaning', 'You are building a classifier and a record has a missing income. Which fill is usually most accurate?', ['A global constant like "unknown"', 'The mean income of all records', 'The mean income of records in the same class', 'Delete every record with any missing value'], 2, 'The class mean uses the label, so it gives a closer estimate than the overall mean.'),
  tf('cleaning', 'Filling missing values with the constant "unknown" can make the algorithm treat "unknown" as a real category.', true, 'That is why a global constant is risky: it can form its own pattern.'),
  mc('cleaning', 'A record has age = 42 but a birth date that makes the person 17. What kind of problem is this?', ['Incomplete data', 'Inconsistent data', 'Redundant data', 'Noise from binning'], 1, 'Two values contradict each other, which is an inconsistency.'),

  num('integration', 'Contingency table, N = 1500. Row total for male is 300, column total for fiction is 450. Expected count for (male, fiction)?', (300 * 450) / 1500, 'e = row x column / N = 300 x 450 / 1500 = 90.'),
  num('integration', 'Observed table [[250, 200], [50, 1000]]. Compute the chi-square statistic (2 decimals).', chi, `Expected counts are 90, 360, 210, 840. Sum of (o - e)^2 / e gives ${f(chi, 2)}.`, 0.05),
  num('integration', 'Degrees of freedom for a 3 x 4 contingency table?', 6, '(3 - 1)(4 - 1) = 6.'),
  num('integration', 'x = 1, 2, 3, 4, 5 and y = 2, 4, 5, 4, 5. Pearson r (3 decimals)?', pearson(rx, ry), `Covariance over the product of standard deviations gives r = ${f(pearson(rx, ry))}.`),
  tf('integration', 'If Pearson r = 0, the two attributes are independent.', false, 'r = 0 only rules out a linear relationship. A ring shape has r near 0 but strong dependence.'),
  mc('integration', 'df = 1, alpha = 0.05 (critical value 3.841), and you get chi-square = 2.1. Conclusion?', ['Reject independence', 'Do not reject independence', 'The attributes are perfectly correlated', 'The test is invalid'], 1, '2.1 is below 3.841, so there is not enough evidence against independence.'),

  num('transformation', 'Income ranges from 12,000 to 98,000. Min-max scale 73,600 to [0, 1] (3 decimals).', (73600 - 12000) / (98000 - 12000), '(73,600 - 12,000) / (98,000 - 12,000) = 61,600 / 86,000 = 0.716.'),
  num('transformation', 'Mean 54,000 and std 16,000. z-score of 73,600?', (73600 - 54000) / 16000, '(73,600 - 54,000) / 16,000 = 1.225.'),
  num('transformation', 'Values range from 0 to 200. Min-max scale 50 to the range [-1, 1].', (50 / 200) * 2 - 1, '(50 - 0) / 200 = 0.25 on [0, 1]. Then 0.25 x (1 - (-1)) + (-1) = -0.5.'),
  num('transformation', 'Decimal scaling: values range from -986 to 917. What is j?', 3, 'The largest absolute value is 986. Dividing by 10^3 gives 0.986 < 1, so j = 3.'),
  mc('transformation', 'An attribute has one extreme outlier. Which normalization keeps the other values spread out best?', ['Min-max to [0, 1]', 'z-score', 'Both are the same', 'Neither changes spread'], 1, 'Min-max uses the outlier as the max, so the other values get squeezed. z-score is less affected.'),
  tf('transformation', 'Min-max normalization keeps the order of the values.', true, 'It is a linear map with a positive slope, so order is preserved.'),

  num('reduction', 'Uniform data in a 10-dimensional unit hypercube. Edge length of a sub-cube holding 1% of the data (3 decimals)?', 0.01 ** (1 / 10), 'l = r^(1/d) = 0.01^(1/10), about 0.631. You need 63% of every range to catch 1% of the points.'),
  num('reduction', 'PCA eigenvalues are 4, 2, 1, 1. Proportion of variance explained by the first 2 components?', 6 / 8, '(4 + 2) / (4 + 2 + 1 + 1) = 0.75.'),
  num('reduction', 'Eigenvalues 5, 3, 1.2, 0.5, 0.3. Smallest k that explains at least 90% of the variance?', 3, 'Cumulative shares: 0.5, 0.8, 0.92. The 90% mark is reached at k = 3.'),
  num('reduction', 'How many subsets does a set of 10 features have?', 1024, '2^10 = 1024, which is why greedy search is used.'),
  mc('reduction', 'Principal components are the eigenvectors of which matrix?', ['The data matrix itself', 'The covariance matrix', 'The confusion matrix', 'The distance matrix'], 1, 'PCA solves Cv = lambda v for the covariance matrix C.'),
  tf('reduction', 'PCA uses the class labels to choose its directions.', false, 'PCA is unsupervised. It only looks at variance.'),
  mc('reduction', 'Your data has 95% class A and 5% class B. Which sampling keeps class B represented?', ['Simple random sampling without replacement', 'Stratified sampling', 'Sampling only the first rows', 'Data cube aggregation'], 1, 'Stratified sampling draws from each class separately.'),

  mc('llm-preprocessing', 'Which prompt is few-shot?', ['"Is there an error in age: 250?"', '"City: Detroit, County: Wayne. City: Fargo, County: Cass. City: Athens, County:"', '"Are there outliers in 70F, 71F, 74F?"', '"Summarize this table."'], 1, 'It shows worked input and output pairs before the new input.'),
  mc('llm-preprocessing', 'Best LLM approach for imputing a missing county from a city?', ['Zero-shot error detection', 'Few-shot pattern completion', 'Chi-square test', 'Min-max scaling'], 1, 'Examples of city and county pairs teach the format and the task.'),
  tf('llm-preprocessing', 'An LLM can flag "banana" as the outlier in {audi, chevrolet, dodge, banana} without numbers.', true, 'It uses world knowledge that banana is not a car brand.'),
  mc('llm-preprocessing', 'You ask "Is New York higher than Chicago?" and "Is Chicago higher than New York?". Both answers are no. The attribute is:', ['Ordinal', 'Nominal (not ordinal)', 'Numeric', 'Binary'], 1, 'No direction holds, so there is no order.'),
  tf('llm-preprocessing', 'LLM outputs for preprocessing can be used without any checking.', false, 'LLMs can be confidently wrong. Check a sample by hand.'),
  mc('llm-preprocessing', 'What do LLMs add over classical statistical preprocessing?', ['Faster arithmetic', 'Semantic world knowledge', 'Exact p-values', 'Lower memory use'], 1, 'They know facts about the values, such as which county a city is in.'),

  num('evaluation', 'TP = 90, FP = 140, FN = 210, TN = 9560. Precision (3 decimals)?', prec, '90 / (90 + 140) = 0.391.'),
  num('evaluation', 'Same matrix. Recall?', rec, '90 / (90 + 210) = 0.300.'),
  num('evaluation', 'Same matrix. F1 (3 decimals)?', (2 * prec * rec) / (prec + rec), `2PR / (P + R) = ${f((2 * prec * rec) / (prec + rec))}.`),
  num('evaluation', 'Same matrix. Accuracy (3 decimals)?', (90 + 9560) / 10000, '(90 + 9560) / 10000 = 0.965. High accuracy, yet most positives are missed.'),
  num('evaluation', 'Per-class F1 scores are 2/3, 0.4 and 2/3. Macro F1 (3 decimals)?', (2 / 3 + 0.4 + 2 / 3) / 3, 'Unweighted mean of the three: 0.578.'),
  num('evaluation', 'In 10-fold cross-validation, what fraction of the data trains each model?', 0.9, '1 - 1/k = 0.9.'),
  tf('evaluation', 'In single-label multi-class problems, micro-averaged F1 equals accuracy.', true, 'Every wrong prediction is one FP and one FN, so micro P = micro R = accuracy.'),
  mc('evaluation', '9,990 healthy and 10 sick patients. A model predicts "healthy" for everyone. Accuracy and recall on "sick"?', ['99.9% and 100%', '99.9% and 0%', '50% and 50%', '0.1% and 0%'], 1, 'It is right 9,990 times out of 10,000 but finds none of the sick patients.'),

  num('decision-trees', 'Entropy of a set with 9 yes and 5 no (3 decimals)?', entropy([9, 5]), '-(9/14)log2(9/14) - (5/14)log2(5/14) = 0.940 bits.'),
  num('decision-trees', 'buys_computer data: information gain of age (3 decimals)?', gainOf('age'), `Info(D) = 0.940 and the expected info after splitting on age is 0.694, so Gain = 0.246. Without rounding the parts it is ${f(gainOf('age'))}. Both are accepted.`),
  num('decision-trees', 'buys_computer data: information gain of student (3 decimals)?', gainOf('student'), `Info(D) = 0.940 minus 0.789 after the split gives 0.151 (${f(gainOf('student'))} without rounding the parts).`),
  num('decision-trees', 'buys_computer data: SplitInfo for age (age has 5 youth, 4 middle_aged, 5 senior) (3 decimals)?', splitInfo('age'), `-(5/14)log2(5/14) - (4/14)log2(4/14) - (5/14)log2(5/14) = ${f(splitInfo('age'))}.`),
  num('decision-trees', 'buys_computer data: gain ratio of age (3 decimals)?', gainOf('age') / splitInfo('age'), `${f(gainOf('age'))} / ${f(splitInfo('age'))} = ${f(gainOf('age') / splitInfo('age'))}.`),
  num('decision-trees', 'Gini index of a node with 9 yes and 5 no (3 decimals)?', gini([9, 5]), '1 - (9/14)^2 - (5/14)^2 = 0.459.'),
  num('decision-trees', 'Entropy of a node with 4 records in each of 3 classes (3 decimals)?', entropy([4, 4, 4]), 'Three equally likely classes: log2 3 = 1.585 bits.'),
  mc('decision-trees', 'Which attribute would plain information gain love most, even though it is useless?', ['A customer ID', 'Age group', 'Student yes/no', 'Credit rating'], 0, 'An ID gives every record its own pure branch, so gain is maximal. Gain ratio penalizes this.'),
  tf('decision-trees', 'Candidate thresholds for a continuous attribute are midpoints between adjacent sorted values.', true, 'Only those points can change which records fall on each side.'),

  num('naive-bayes', 'buys_computer data, X = (youth, medium, student yes, fair). Compute P(X | yes) P(yes) (4 decimals).', nbScore('yes', X), `9/14 x 2/9 x 4/9 x 6/9 x 6/9 = ${f(nbScore('yes', X), 4)}.`, 0.0005),
  num('naive-bayes', 'Same X. Compute P(X | no) P(no) (4 decimals).', nbScore('no', X), `5/14 x 3/5 x 2/5 x 1/5 x 2/5 = ${f(nbScore('no', X), 4)}.`, 0.0005),
  mc('naive-bayes', 'Using the two scores above, which class does naive Bayes predict for X?', ['yes', 'no', 'A tie', 'Cannot tell without P(X)'], 0, `${f(nbScore('yes', X), 4)} > ${f(nbScore('no', X), 4)}, so yes. P(X) is the same for both classes.`),
  num('naive-bayes', 'Prevalence 1%, sensitivity 99%, false positive rate 5%. P(disease | positive) (3 decimals)?', (0.99 * 0.01) / (0.99 * 0.01 + 0.05 * 0.99), '0.0099 / (0.0099 + 0.0495) = 0.167.'),
  num('naive-bayes', 'Class has 1000 records, income has 3 values, and "low" never appears. Laplace-corrected P(low | class) (4 decimals)?', 1 / 1003, '(0 + 1) / (1000 + 3) = 0.0010.', 0.0001),
  tf('naive-bayes', 'Naive Bayes assumes attributes are independent of each other with no conditions.', false, 'It assumes conditional independence given the class, which is weaker.'),
  mc('naive-bayes', 'Why do implementations sum log-probabilities?', ['To make results exact', 'To avoid floating-point underflow from multiplying many small numbers', 'Because logs are required by Bayes rule', 'To apply Laplace correction'], 1, 'Products of many tiny probabilities round to 0. Sums of logs do not.'),

  num('knn', 'Euclidean distance between (1, 2) and (4, 6)?', minkowski([1, 2], [4, 6], 2), 'sqrt(3^2 + 4^2) = 5.'),
  num('knn', 'Manhattan distance between (1, 2) and (4, 6)?', minkowski([1, 2], [4, 6], 1), '3 + 4 = 7.'),
  num('knn', 'Chebyshev (p to infinity) distance between (1, 2) and (4, 6)?', minkowski([1, 2], [4, 6], Infinity), 'max(3, 4) = 4.'),
  num('knn', 'Minkowski distance with p = 3 between (0, 0) and (3, 4) (3 decimals)?', minkowski([0, 0], [3, 4], 3), '(27 + 64)^(1/3) = 91^(1/3) = 4.498.'),
  mc('knn', 'The 5 nearest neighbors have classes A, B, A, B, A. 3-NN uses the first three. Predictions for 3-NN and 5-NN?', ['A and A', 'B and A', 'A and B', 'Tie in both'], 0, '3-NN: A, B, A gives A. 5-NN: three A and two B gives A.'),
  tf('knn', 'Without normalization, an attribute measured in thousands can dominate the kNN distance.', true, 'Its differences are much larger, so it decides who is nearest.'),
  mc('knn', 'What happens as k grows toward the number of training records?', ['The model memorizes the data', 'Predictions approach the majority class everywhere', 'Training time grows', 'Distances become 0'], 1, 'With k = n every query sees the same neighbors.'),

  num('perceptron', 'w = (0.2, -0.1), alpha = 0.5, input I = (1, 1), target T = 1, output O = 0. New w1?', 0.2 + 0.5 * (1 - 0) * 1, 'w1 = 0.2 + 0.5 x (1 - 0) x 1 = 0.7.'),
  num('perceptron', 'Same step. New w2?', -0.1 + 0.5 * (1 - 0) * 1, 'w2 = -0.1 + 0.5 x 1 x 1 = 0.4.'),
  num('perceptron', 'Weights (1, 1), threshold 1.5, input (1, 1). Output (1 if sum > threshold, else 0)?', 1, '1 + 1 = 2 > 1.5, so the output is 1. These weights implement AND.'),
  num('perceptron', 'The perceptron predicts correctly (T = O). By how much does each weight change?', 0, 'T - O = 0, so the update is 0.'),
  tf('perceptron', 'A single perceptron can represent XOR.', false, 'XOR is not linearly separable.'),
  mc('perceptron', 'Weights (1, 1) and threshold 0.5 implement which function?', ['AND', 'OR', 'NOT', 'XOR'], 1, 'Any input with a 1 gives a sum of at least 1 > 0.5.'),

  num('neural-networks', 'sigmoid(0)?', sig(0), '1 / (1 + e^0) = 0.5.'),
  num('neural-networks', 'sigmoid(2) (3 decimals)?', sig(2), '1 / (1 + e^-2) = 0.881.'),
  num('neural-networks', 'A sigmoid unit outputs 0.8. Its derivative at that point?', 0.8 * 0.2, 'sigma(1 - sigma) = 0.8 x 0.2 = 0.16.'),
  num('neural-networks', 'Inputs (1, 0.5), weights (0.4, -0.6), bias 0.1, sigmoid activation. Output (3 decimals)?', sig(0.4 - 0.3 + 0.1), 'z = 0.4 - 0.3 + 0.1 = 0.2. sigmoid(0.2) = 0.550.'),
  tf('neural-networks', 'A network with one hidden layer can represent XOR.', true, 'The hidden units carve two lines and the output combines them.'),
  mc('neural-networks', 'Backpropagation computes what?', ['The class prior', 'The gradient of the error with respect to each weight', 'The best number of hidden units', 'The test accuracy'], 1, 'It applies the chain rule from the output layer back to the inputs.'),

  num('regression', 'Points (1, 2), (2, 4), (3, 5). Least squares slope?', slope, `Sxy = 3, Sxx = 2, slope = 1.5.`),
  num('regression', 'Same points. Intercept (3 decimals)?', icpt, `y mean 3.667 minus 1.5 x 2 = ${f(icpt)}.`),
  num('regression', 'Same fit. R squared (3 decimals)?', 1 - sseR / sstR, `SSE = ${f(sseR)}, SST = ${f(sstR)}, R^2 = ${f(1 - sseR / sstR)}.`),
  tf('regression', 'The slope of the least squares line and the correlation coefficient always have the same sign.', true, 'Both share the covariance in the numerator.'),
  mc('regression', 'A degree-9 polynomial passes through all 10 training points. Most likely result on new data?', ['Perfect predictions', 'Poor predictions from overfitting', 'Same as a straight line', 'R squared below 0 on training data'], 1, 'It fits the noise and swings wildly between points.'),
  mc('regression', 'What is a residual?', ['Predicted minus mean', 'Actual minus predicted', 'Slope times x', 'The intercept'], 1, 'Residual = y - y hat.'),

  num('rule-based', 'A rule covers 14 of 40 records. Coverage?', 14 / 40, '14 / 40 = 0.35.'),
  num('rule-based', 'It classifies 12 of those 14 correctly. Accuracy (3 decimals)?', 12 / 14, '12 / 14 = 0.857.'),
  mc('rule-based', 'Two rules fire and predict different classes. Size ordering picks:', ['The rule with fewest conditions', 'The rule with most conditions', 'The rule learned first', 'A random rule'], 1, 'Size ordering prefers the most specific rule (toughest condition).'),
  tf('rule-based', 'Rules read off a decision tree are mutually exclusive.', true, 'Each record follows exactly one root-to-leaf path.'),
  mc('rule-based', 'Sequential covering does what after learning a rule?', ['Deletes the rule', 'Removes the records the rule covers and learns the next rule', 'Restarts with all data', 'Merges it with the previous rule'], 1, 'That is the covering loop.'),
  mc('rule-based', 'What handles a record no rule covers?', ['An error', 'A default rule', 'kNN', 'Laplace correction'], 1, 'A default rule, usually the majority class.'),

  num('clustering-basics', 'Binary x = 1,0,0,1,1,0 and y = 1,1,0,0,1,0. Simple matching coefficient (3 decimals)?', 4 / 6, 'Matches in positions 1, 3, 5, 6: 4 of 6 = 0.667.'),
  num('clustering-basics', 'Same vectors. Jaccard coefficient?', 2 / 4, 'f11 = 2, f10 = 1, f01 = 1. J = 2 / 4 = 0.5.'),
  num('clustering-basics', 'An object has a = 2 (own cluster) and b = 5 (nearest other cluster). Silhouette?', (5 - 2) / 5, '(5 - 2) / max(2, 5) = 0.6.'),
  num('clustering-basics', 'Two objects with 5 nominal attributes match on 2. Distance d = (p - m) / p?', 3 / 5, '(5 - 2) / 5 = 0.6.'),
  num('clustering-basics', 'Cosine similarity of (1, 0, 1) and (1, 1, 0)?', 1 / 2, 'Dot product 1, lengths sqrt(2) each: 1 / 2 = 0.5.'),
  tf('clustering-basics', 'Jaccard counts 0-0 matches as similarity.', false, 'It ignores them, which suits sparse data like shopping baskets.'),

  num('kmeans', 'Points 2, 3, 4, 10, 12, 20. Centroids 3 and 15. After one assign and update step, new value of centroid 2?', mean([10, 12, 20]), '10 is closer to 15 (5) than to 3 (7). Cluster 2 = {10, 12, 20}, mean 14.'),
  num('kmeans', 'Cluster {1, 3} with centroid 2. Its SSE?', 2, '(1 - 2)^2 + (3 - 2)^2 = 2.'),
  num('kmeans', 'Centroid of (1, 1), (3, 1), (2, 4): y coordinate?', 2, '(1 + 1 + 4) / 3 = 2.'),
  tf('kmeans', 'k-means always finds the global minimum of SSE.', false, 'It stops at a local minimum that depends on the starting centroids.'),
  mc('kmeans', 'What does k-means++ change?', ['The distance metric', 'How the initial centroids are chosen', 'The update rule', 'How k is chosen'], 1, 'It spreads out the starting centroids, which usually lowers final SSE.'),
  mc('kmeans', 'Which method resists a single far outlier better?', ['k-means', 'k-medoids', 'Both equally', 'Neither works with outliers'], 1, 'A medoid is a real point minimizing summed distance, so one outlier barely moves it.'),

  num('hierarchical', 'd(A, C) = 4 and d(B, C) = 7. Single linkage distance between {A, B} and {C}?', 4, 'Single linkage takes the minimum.'),
  num('hierarchical', 'Same distances. Complete linkage?', 7, 'Complete linkage takes the maximum.'),
  num('hierarchical', 'Same distances. Average linkage?', 5.5, '(4 + 7) / 2 = 5.5.'),
  num('hierarchical', 'How many merges does agglomerative clustering perform on 10 points?', 9, 'Each merge reduces the cluster count by one: 10 to 1 takes 9.'),
  tf('hierarchical', 'Hierarchical clustering needs k before it runs.', false, 'You build the full dendrogram and choose where to cut later.'),
  mc('hierarchical', 'Which linkage suffers most from chaining?', ['Single', 'Complete', 'Average', 'Ward'], 0, 'A thin line of close points links distant groups under single linkage.'),

  num('dbscan', '1D points 1, 2, 3, 8, 9, 10, 25 with eps = 1.5 and MinPts = 2 (point itself counts). How many clusters?', 2, '{1, 2, 3} and {8, 9, 10} are dense chains. 25 has no neighbor.'),
  num('dbscan', 'Same setup. How many noise points?', 1, 'Only 25.'),
  tf('dbscan', 'With MinPts = 4, a point with 3 other points inside its eps radius is a core point.', true, 'Counting itself, it has 4 points in its neighborhood.'),
  mc('dbscan', 'A point is not core but lies within eps of a core point. It is a:', ['Core point', 'Border point', 'Noise point', 'Medoid'], 1, 'That is the definition of a border point.'),
  tf('dbscan', 'DBSCAN needs the number of clusters as input.', false, 'It needs eps and MinPts. The number of clusters is an output.'),
  mc('dbscan', 'Clusters have very different densities. What goes wrong?', ['Nothing', 'One eps cannot fit all clusters', 'It becomes k-means', 'It needs labels'], 1, 'A small eps breaks the sparse cluster, a large one merges dense ones.'),

  num('outliers', 'Q1 = 10 and Q3 = 20. Upper outlier fence?', 20 + 1.5 * 10, 'IQR = 10. Q3 + 1.5 x IQR = 35.'),
  num('outliers', 'Mean 50, std 5. z-score of 66?', (66 - 50) / 5, '(66 - 50) / 5 = 3.2, beyond the usual 3 cutoff.'),
  num('outliers', '1D points 1, 2, 4, 7, 20. Distance from 20 to its 2nd nearest neighbor?', 16, 'Neighbors of 20: 7 (13), 4 (16). The 2nd nearest is 16 away.'),
  mc('outliers', 'LOF of a point is 4.2. Meaning?', ['As dense as its neighbors', 'Much sparser than its neighbors, likely an outlier', 'It is a core point', 'It is in the densest cluster'], 1, 'LOF well above 1 means lower local density than the neighbors.'),
  tf('outliers', 'Outliers should always be deleted as errors.', false, 'In fraud or fault detection the outliers are the target.'),
  mc('outliers', '30C in Hong Kong in July is normal, but 30C in January is unusual. This is a:', ['Global outlier', 'Contextual outlier', 'Collective outlier', 'Not an outlier'], 1, 'It is only unusual in its context (the month).'),

  num('apriori', 'In the 10 cafe baskets (coffee, croissant, cookie, milk tea, egg tart, sandwich, water), support of {coffee, croissant}?', sup(['coffee', 'croissant']), `${Math.round(sup(['coffee', 'croissant']) * 10)} of 10 baskets contain both: ${f(sup(['coffee', 'croissant']), 2)}.`),
  num('apriori', 'Same baskets. Confidence of coffee => croissant (3 decimals)?', sup(['coffee', 'croissant']) / sup(['coffee']), `${f(sup(['coffee', 'croissant']), 2)} / ${f(sup(['coffee']), 2)} = ${f(sup(['coffee', 'croissant']) / sup(['coffee']))}.`),
  num('apriori', 'Same baskets. Lift of coffee and croissant (3 decimals)?', sup(['coffee', 'croissant']) / (sup(['coffee']) * sup(['croissant'])), `${f(sup(['coffee', 'croissant']), 2)} / (${f(sup(['coffee']), 2)} x ${f(sup(['croissant']), 2)}) = ${f(sup(['coffee', 'croissant']) / (sup(['coffee']) * sup(['croissant'])))}.`),
  num('apriori', '5 frequent single items. How many candidate 2-itemsets does Apriori generate?', 10, '5 choose 2 = 10.'),
  num('apriori', 'How many non-empty itemsets can be formed from 4 items?', 15, '2^4 - 1 = 15.'),
  tf('apriori', 'If {sandwich, croissant} is infrequent, then {sandwich, croissant, coffee} cannot be frequent.', true, 'Apriori property: supersets of infrequent itemsets are infrequent.'),
  mc('apriori', 'sup(A) = 0.4, sup(B) = 0.9, sup(A and B) = 0.36. Confidence of A => B is 0.9. Lift?', ['1.0, no real association', '2.25, strong', '0.36', '0.9'], 0, '0.36 / (0.4 x 0.9) = 1.0. High confidence only because B is everywhere.'),

  num('fp-growth', 'How many full database scans does FP-growth need to build its tree?', 2, 'One to count item supports, one to insert transactions.'),
  mc('fp-growth', 'Items in each transaction are inserted into the FP-tree in which order?', ['Alphabetical', 'Descending support', 'Ascending support', 'Random'], 1, 'Frequent items first, so transactions share long prefixes.'),
  mc('fp-growth', 'The conditional pattern base of item m is:', ['All transactions without m', 'The prefix paths ending at m, with counts', 'The header table', 'All frequent itemsets'], 1, 'Mining continues on the conditional FP-tree built from it.'),
  tf('fp-growth', 'FP-growth generates candidate itemsets like Apriori.', false, 'It grows patterns from conditional trees with no candidate generation.'),
  mc('fp-growth', 'When is the FP-tree least compact?', ['Dense data with shared prefixes', 'Sparse data where transactions share few prefixes', 'Very few items', 'High minimum support'], 1, 'Few shared prefixes means few shared nodes.'),
  tf('fp-growth', 'The header table links every node of the same item in the tree.', true, 'Node links let you collect all paths for an item.'),
]
