# Mining Lab

**Live site: https://data-mining-wb.vercel.app**

An interactive guide to data mining: preprocessing, classification, clustering and association rules. Each topic gives you the idea in plain words, the formulas, a worked example, and labs where you change the data and watch the algorithm respond.

## What's inside

- **22 topics in 5 modules**, from cleaning raw records to mining association rules
- **Interactive labs** on every topic: drag points, change k or eps, edit transactions, step through an algorithm one move at a time
- **Formulas you can hover**: every formula on the site opens a plain explanation of what it computes and what each symbol means
- **Worked examples** with every step shown, plus quick self-checks
- **Flashcards** by topic, with progress saved in your browser
- **Practice quiz** with calculation and concept questions and worked answers
- **Dataset playground**: paste any CSV and run k-means, k-medoids, DBSCAN, hierarchical clustering or kNN on it
- **Study guide**: a topic map, a "which method for which question" table, common mistakes and a full formula sheet
- **Where to find data**: Kaggle, Hugging Face, UCI, OpenML, GitHub and government portals, starter datasets matched to each topic, and the Python to load them
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

## How it's checked

`npm run check` runs the algorithms behind the labs against answers you can verify by hand or in the textbook: the decision-tree gains for the buys_computer data, chi-square values, Apriori and FP-growth finding the same itemsets, DBSCAN labels, linkage merge heights, LOF scores and a neural network learning XOR.

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
  components/  page building blocks, charts, formulas and controls
scripts/       the algorithm checks
```

Design notes (palette, type, principles) are in `.impeccable.md`.

## Contributing

Spotted a mistake or have a dataset to suggest? Open an issue or a pull request.
