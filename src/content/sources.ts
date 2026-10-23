export type Source = { name: string; url: string; kind: string; good: string }

export const SOURCES: Source[] = [
  { name: 'Kaggle Datasets', url: 'https://www.kaggle.com/datasets', kind: 'Community', good: 'Huge range of cleaned datasets with notebooks from other people. Filter by size, file type and license.' },
  { name: 'UCI Machine Learning Repository', url: 'https://archive.ics.uci.edu/', kind: 'Academic', good: 'The classic course datasets. Small, well documented, with attribute descriptions.' },
  { name: 'OpenML', url: 'https://www.openml.org/', kind: 'Academic', good: 'Datasets with standard tasks and benchmark results, easy to load from Python.' },
  { name: 'Hugging Face Datasets', url: 'https://huggingface.co/datasets', kind: 'Community', good: 'Text, image and audio data. One line to load with the datasets library.' },
  { name: 'Google Dataset Search', url: 'https://datasetsearch.research.google.com/', kind: 'Search', good: 'A search engine for datasets across the web. Good when you have a topic but no source.' },
  { name: 'data.gov', url: 'https://data.gov/', kind: 'Government', good: 'US government open data: health, transport, climate, education.' },
  { name: 'DATA.GOV.HK', url: 'https://data.gov.hk/en/', kind: 'Government', good: 'Hong Kong open data: transport, weather, population, housing. Great for local projects.' },
  { name: 'Registry of Open Data on AWS', url: 'https://registry.opendata.aws/', kind: 'Cloud', good: 'Very large datasets (satellite images, genomics) hosted for free on AWS.' },
  { name: 'World Bank Open Data', url: 'https://data.worldbank.org/', kind: 'Government', good: 'Country-level indicators over decades. Good for time series and regression.' },
  { name: 'Our World in Data', url: 'https://ourworldindata.org/', kind: 'Research', good: 'Clean global data on health, energy, economy, with every chart downloadable as CSV.' },
  { name: 'awesome-public-datasets', url: 'https://github.com/awesomedata/awesome-public-datasets', kind: 'GitHub', good: 'A long curated list of public datasets sorted by field.' },
  { name: 'fivethirtyeight/data', url: 'https://github.com/fivethirtyeight/data', kind: 'GitHub', good: 'The data behind FiveThirtyEight articles: sports, politics, culture. Each folder has a story.' },
  { name: 'TidyTuesday', url: 'https://github.com/rfordatascience/tidytuesday', kind: 'GitHub', good: 'A new small, interesting dataset every week since 2018. Perfect for practice.' },
  { name: 'SNAP (Stanford)', url: 'https://snap.stanford.edu/data/', kind: 'Academic', good: 'Large network datasets: social graphs, web graphs, citation networks.' },
  { name: 'MovieLens (GroupLens)', url: 'https://grouplens.org/datasets/movielens/', kind: 'Academic', good: 'Movie ratings in several sizes. The standard dataset for recommender systems.' },
  { name: 'NYC TLC Trip Records', url: 'https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page', kind: 'Government', good: 'Millions of taxi trips with times and zones. Good for big data and spatial clustering.' },
  { name: 'UCR/UEA Time Series archive', url: 'https://www.timeseriesclassification.com/', kind: 'Academic', good: 'Benchmark time series classification datasets, ideal for kNN with DTW.' },
  { name: 'Inside Airbnb', url: 'https://insideairbnb.com/get-the-data/', kind: 'Research', good: 'Listings, prices and reviews by city. Good for regression and clustering neighborhoods.' },
]

export type Starter = { name: string; url: string; size: string; topics: string[]; why: string }

export const STARTERS: Starter[] = [
  { name: 'Iris', url: 'https://archive.ics.uci.edu/dataset/53/iris', size: '150 rows, 4 numeric', topics: ['summary', 'reduction', 'kmeans', 'knn'], why: 'Tiny and clean. The first dataset for PCA, clustering and kNN.' },
  { name: 'Adult (census income)', url: 'https://archive.ics.uci.edu/dataset/2/adult', size: '48,842 rows, mixed', topics: ['cleaning', 'decision-trees', 'naive-bayes'], why: 'Real missing values and mixed attribute types.' },
  { name: 'Wine Quality', url: 'https://archive.ics.uci.edu/dataset/186/wine+quality', size: '6,497 rows, 11 numeric', topics: ['regression', 'transformation', 'knn'], why: 'Numeric attributes on very different scales, a clear case for normalization.' },
  { name: 'Breast Cancer Wisconsin (Diagnostic)', url: 'https://archive.ics.uci.edu/dataset/17/breast+cancer+wisconsin+diagnostic', size: '569 rows, 30 numeric', topics: ['knn', 'reduction', 'evaluation'], why: 'Many correlated features, good for PCA and recall-focused evaluation.' },
  { name: 'Mushroom', url: 'https://archive.ics.uci.edu/dataset/73/mushroom', size: '8,124 rows, 22 categorical', topics: ['decision-trees', 'rule-based', 'naive-bayes'], why: 'All categorical. Compute entropy and gain directly.' },
  { name: 'Car Evaluation', url: 'https://archive.ics.uci.edu/dataset/19/car+evaluation', size: '1,728 rows, 6 categorical', topics: ['decision-trees', 'rule-based'], why: 'Generated from hidden rules, so a tree can recover them.' },
  { name: 'Bank Marketing', url: 'https://archive.ics.uci.edu/dataset/222/bank+marketing', size: '45,211 rows, mixed', topics: ['evaluation', 'decision-trees'], why: 'Imbalanced target and a leaking attribute to spot.' },
  { name: 'Spambase', url: 'https://archive.ics.uci.edu/dataset/94/spambase', size: '4,601 rows, 57 numeric', topics: ['naive-bayes', 'evaluation'], why: 'Word frequency features for spam classification.' },
  { name: 'SMS Spam Collection', url: 'https://archive.ics.uci.edu/dataset/228/sms+spam+collection', size: '5,574 messages', topics: ['naive-bayes'], why: 'Raw text, so you build bag-of-words yourself.' },
  { name: 'Online Retail', url: 'https://archive.ics.uci.edu/dataset/352/online+retail', size: '541,909 rows', topics: ['apriori', 'cleaning', 'kmeans'], why: 'Real transactions for basket analysis and RFM segmentation.' },
  { name: 'Wholesale customers', url: 'https://archive.ics.uci.edu/dataset/292/wholesale+customers', size: '440 rows, 8 attributes', topics: ['kmeans', 'outliers'], why: 'Skewed spending data with clear outliers.' },
  { name: 'Heart Disease', url: 'https://archive.ics.uci.edu/dataset/45/heart+disease', size: '303 rows, 13 attributes', topics: ['naive-bayes', 'neural-networks'], why: 'Small medical classification task.' },
  { name: 'Credit Card Fraud (Kaggle)', url: 'https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud', size: '284,807 rows', topics: ['evaluation', 'outliers'], why: 'Extreme class imbalance: 0.17% fraud.' },
  { name: 'Mall Customers (Kaggle)', url: 'https://www.kaggle.com/datasets/vjchoudhary7/customer-segmentation-tutorial-in-python', size: '200 rows', topics: ['kmeans', 'hierarchical'], why: 'Visible clusters in 2D. A gentle first clustering project.' },
  { name: 'Groceries (Kaggle)', url: 'https://www.kaggle.com/datasets/heeraldedhia/groceries-dataset', size: '38,765 rows', topics: ['apriori', 'fp-growth'], why: 'Member and date per item, ready to group into baskets.' },
  { name: 'Instacart Market Basket (Kaggle)', url: 'https://www.kaggle.com/c/instacart-market-basket-analysis', size: '3M+ orders', topics: ['apriori', 'fp-growth'], why: 'Large real basket data to test how mining scales.' },
  { name: 'Titanic (Kaggle)', url: 'https://www.kaggle.com/c/titanic', size: '891 training rows', topics: ['cleaning', 'decision-trees'], why: 'Missing ages and cabins, a classic cleaning exercise.' },
]
