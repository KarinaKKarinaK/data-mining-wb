import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export type Topic = {
  id: string
  title: string
  short: string
  group: Group
  blurb: string
  lecture?: string
  Comp: LazyExoticComponent<ComponentType>
}

export type Group = 'Foundations' | 'Preprocessing' | 'Classification' | 'Clustering' | 'Association'
export const GROUPS: Group[] = ['Foundations', 'Preprocessing', 'Classification', 'Clustering', 'Association']

export const TOPICS: Topic[] = [
  { id: 'intro', title: 'What data mining is', short: 'Introduction', group: 'Foundations', lecture: 'L1', blurb: 'The KDD process, kinds of data, and the five big tasks.', Comp: lazy(() => import('./intro')) },
  { id: 'summary', title: 'Summarizing data', short: 'Data summarization', group: 'Foundations', lecture: 'L2', blurb: 'Mean, median, quartiles, spread, boxplots and histograms you can drag.', Comp: lazy(() => import('./summary')) },
  { id: 'cleaning', title: 'Data cleaning', short: 'Cleaning', group: 'Preprocessing', lecture: 'L2', blurb: 'Missing values, noise, binning and inconsistencies.', Comp: lazy(() => import('./cleaning')) },
  { id: 'integration', title: 'Integration, correlation and chi-square', short: 'Integration', group: 'Preprocessing', lecture: 'L2', blurb: 'Spot redundant attributes with Pearson r and the chi-square test.', Comp: lazy(() => import('./integration')) },
  { id: 'transformation', title: 'Normalization and discretization', short: 'Transformation', group: 'Preprocessing', lecture: 'L2', blurb: 'Min-max, z-score, decimal scaling and binning a continuous attribute.', Comp: lazy(() => import('./transformation')) },
  { id: 'reduction', title: 'Data reduction and PCA', short: 'Reduction and PCA', group: 'Preprocessing', lecture: 'L2', blurb: 'Curse of dimensionality, PCA, feature selection and sampling.', Comp: lazy(() => import('./reduction')) },
  { id: 'llm-preprocessing', title: 'LLMs as data preprocessors', short: 'LLM preprocessing', group: 'Preprocessing', lecture: 'L2', blurb: 'Zero-shot and few-shot prompts for error detection, imputation and more.', Comp: lazy(() => import('./llm')) },
  { id: 'evaluation', title: 'Classification and evaluation', short: 'Evaluation', group: 'Classification', lecture: 'L3', blurb: 'Confusion matrix, precision, recall, F1, macro vs micro, cross-validation.', Comp: lazy(() => import('./evaluation')) },
  { id: 'decision-trees', title: 'Decision trees', short: 'Decision trees', group: 'Classification', lecture: 'L3', blurb: 'Entropy, information gain, gain ratio, continuous splits and pruning.', Comp: lazy(() => import('./trees')) },
  { id: 'naive-bayes', title: 'Bayes rule and naive Bayes', short: 'Naive Bayes', group: 'Classification', lecture: 'L3', blurb: 'Posterior from prior and likelihood, Laplace correction, log probabilities.', Comp: lazy(() => import('./bayes')) },
  { id: 'knn', title: 'Nearest neighbors', short: 'kNN', group: 'Classification', lecture: 'L3', blurb: 'Distance metrics, choosing k, scaling and dynamic time warping.', Comp: lazy(() => import('./knn')) },
  { id: 'perceptron', title: 'Perceptrons', short: 'Perceptron', group: 'Classification', lecture: 'L4', blurb: 'Weights, thresholds, linear separability and the learning rule.', Comp: lazy(() => import('./perceptron')) },
  { id: 'neural-networks', title: 'Neural networks', short: 'Neural networks', group: 'Classification', blurb: 'Hidden layers, backpropagation and nonlinear decision boundaries.', Comp: lazy(() => import('./mlp')) },
  { id: 'regression', title: 'Regression', short: 'Regression', group: 'Classification', blurb: 'Least squares, residuals, R squared and overfitting with polynomials.', Comp: lazy(() => import('./regression')) },
  { id: 'rule-based', title: 'Rule-based classification', short: 'Rule-based', group: 'Classification', blurb: 'IF-THEN rules, coverage, accuracy and sequential covering.', Comp: lazy(() => import('./rules')) },
  { id: 'clustering-basics', title: 'Clustering basics', short: 'Clustering basics', group: 'Clustering', blurb: 'Similarity, distance for every attribute type, and judging cluster quality.', Comp: lazy(() => import('./clustering')) },
  { id: 'kmeans', title: 'k-means and k-medoids', short: 'k-means', group: 'Clustering', blurb: 'Partitioning step by step, SSE, the elbow method and why medoids resist outliers.', Comp: lazy(() => import('./kmeans')) },
  { id: 'hierarchical', title: 'Hierarchical clustering', short: 'Hierarchical', group: 'Clustering', blurb: 'Agglomerative merging, linkage choices and reading a dendrogram.', Comp: lazy(() => import('./hierarchical')) },
  { id: 'dbscan', title: 'Density-based clustering', short: 'DBSCAN', group: 'Clustering', blurb: 'Core, border and noise points with eps and MinPts.', Comp: lazy(() => import('./dbscan')) },
  { id: 'outliers', title: 'Outlier detection', short: 'Outliers', group: 'Clustering', blurb: 'Statistical, distance-based and density-based (LOF) outliers.', Comp: lazy(() => import('./outliers')) },
  { id: 'apriori', title: 'Frequent itemsets and Apriori', short: 'Apriori', group: 'Association', blurb: 'Support, confidence, lift and level-wise candidate pruning.', Comp: lazy(() => import('./apriori')) },
  { id: 'fp-growth', title: 'FP-growth', short: 'FP-growth', group: 'Association', blurb: 'Compress transactions into an FP-tree and mine without candidates.', Comp: lazy(() => import('./fpgrowth')) },
]

export const topicById = (id: string) => TOPICS.find((t) => t.id === id)
