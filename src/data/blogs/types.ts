export interface BlogSection {
  id: string;
  heading: string;
  content: string;
  subSections?: {
    heading: string;
    content: string;
  }[];
}

export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  featuredImage: string;
  featuredImageAlt: string;
  author: string;
  tags: string[];
  sections: BlogSection[];
  tableOfContents: {
    id: string;
    title: string;
  }[];
  faqs?: {
    question: string;
    answer: string;
  }[];
}

export interface BlogArticleMeta {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  featuredImage: string;
  featuredImageAlt: string;
  author: string;
}
