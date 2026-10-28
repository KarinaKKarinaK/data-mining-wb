# Mining Lab

**Live site: https://data-mining-wb.vercel.app**

Learn data mining by changing the numbers. Every topic has a plain-words explanation, the formulas, and interactive labs where you move the inputs and watch the result update.

## What's inside

- **22 topics in 5 modules**, from cleaning data to association rules
- **Interactive labs** on every topic: drag points, change k or eps, edit transactions, step through an algorithm
- **Worked examples** with every step shown, plus quick self-checks
- **Flashcards** by topic, with progress saved in your browser
- **Practice quiz** with calculation and concept questions and worked answers
- **Dataset playground**: paste any CSV and run k-means, DBSCAN, hierarchical clustering or kNN on it
- **Study guide** with a topic map, a "which method for which question" table, common mistakes and a formula sheet: hover any formula for what it does and what each symbol means
- **Where to find data**: Kaggle, Hugging Face, UCI, OpenML, GitHub and government portals, plus starter datasets matched to each topic
- **Books, videos and tools**: free textbooks, library docs, visual explainers and the Python tools worth knowing
- Search everything with `⌘K`

## Topics

| Module | Topics |
|---|---|
| Foundations | What data mining is, summarizing data |
| Preprocessing | Cleaning, integration and chi-square, normalization and discretization, reduction and PCA, LLMs as data preprocessors |
| Classification | Evaluation, decision trees, naive Bayes, nearest neighbors, perceptrons, neural networks, regression, rule-based classification |
| Clustering | Clustering basics, k-means and k-medoids, hierarchical clustering, DBSCAN, outlier detection |
| Association | Apriori, FP-growth |

The explanations follow the standard treatment in Han, Kamber and Pei, *Data Mining: Concepts and Techniques* (3rd ed.).

## Run locally

Needs Node 20.19+ or 22.12+ (required by Vite).

```
npm install
npm run dev
```

Other scripts:

```
npm run build     # type-check and build to dist/
npm run preview   # serve the built site
npm run lint      # oxlint
npm run check     # check the algorithms against known textbook answers
```

## How it's built

- React 19, TypeScript, Vite
- React Router for pages, KaTeX for formulas
- Charts are hand-written SVG, so there is no chart library
- Every algorithm runs in the browser, written from scratch in `src/lib/`
- Deployed on Vercel

```
src/
  topics/      one file per topic page
  lib/         the algorithms: stats, tree, mlp, cluster, hierarchical, density, assoc, geom
  pages/       home, study guide, flashcards, quiz, playground, datasets, resources
  content/     quiz questions, flashcards, datasets, resources, case studies, project ideas
  components/  page building blocks, charts and controls
```

## Contributing

Spotted a mistake or have a dataset to suggest? Open an issue or a pull request.
