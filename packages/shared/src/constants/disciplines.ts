export interface Discipline {
  name: string;
  slug: string;
  children?: Discipline[];
}

export const DISCIPLINES: Discipline[] = [
  {
    name: "Computer Science",
    slug: "computer-science",
    children: [
      { name: "Artificial Intelligence", slug: "artificial-intelligence" },
      { name: "Machine Learning", slug: "machine-learning" },
      { name: "Computer Vision", slug: "computer-vision" },
      {
        name: "Natural Language Processing",
        slug: "natural-language-processing",
      },
      { name: "Software Engineering", slug: "software-engineering" },
      { name: "Cybersecurity", slug: "cybersecurity" },
      { name: "Data Science", slug: "data-science" },
      { name: "Human-Computer Interaction", slug: "human-computer-interaction" },
      { name: "Distributed Systems", slug: "distributed-systems" },
      { name: "Theory of Computation", slug: "theory-of-computation" },
    ],
  },
  {
    name: "Mathematics",
    slug: "mathematics",
    children: [
      { name: "Pure Mathematics", slug: "pure-mathematics" },
      { name: "Applied Mathematics", slug: "applied-mathematics" },
      { name: "Statistics", slug: "statistics" },
      { name: "Probability", slug: "probability" },
    ],
  },
  {
    name: "Physics",
    slug: "physics",
    children: [
      { name: "Theoretical Physics", slug: "theoretical-physics" },
      { name: "Experimental Physics", slug: "experimental-physics" },
      { name: "Condensed Matter", slug: "condensed-matter" },
      { name: "Quantum Physics", slug: "quantum-physics" },
      { name: "Astrophysics", slug: "astrophysics" },
      { name: "Particle Physics", slug: "particle-physics" },
    ],
  },
  {
    name: "Biology",
    slug: "biology",
    children: [
      { name: "Molecular Biology", slug: "molecular-biology" },
      { name: "Genetics", slug: "genetics" },
      { name: "Ecology", slug: "ecology" },
      { name: "Neuroscience", slug: "neuroscience" },
      { name: "Evolutionary Biology", slug: "evolutionary-biology" },
      { name: "Microbiology", slug: "microbiology" },
      { name: "Bioinformatics", slug: "bioinformatics" },
    ],
  },
  {
    name: "Chemistry",
    slug: "chemistry",
    children: [
      { name: "Organic Chemistry", slug: "organic-chemistry" },
      { name: "Inorganic Chemistry", slug: "inorganic-chemistry" },
      { name: "Physical Chemistry", slug: "physical-chemistry" },
      { name: "Biochemistry", slug: "biochemistry" },
      { name: "Analytical Chemistry", slug: "analytical-chemistry" },
    ],
  },
  {
    name: "Medicine & Health Sciences",
    slug: "medicine-health-sciences",
    children: [
      { name: "Clinical Medicine", slug: "clinical-medicine" },
      { name: "Public Health", slug: "public-health" },
      { name: "Epidemiology", slug: "epidemiology" },
      { name: "Pharmacology", slug: "pharmacology" },
      { name: "Biomedical Engineering", slug: "biomedical-engineering" },
    ],
  },
  {
    name: "Engineering",
    slug: "engineering",
    children: [
      { name: "Electrical Engineering", slug: "electrical-engineering" },
      { name: "Mechanical Engineering", slug: "mechanical-engineering" },
      { name: "Civil Engineering", slug: "civil-engineering" },
      { name: "Chemical Engineering", slug: "chemical-engineering" },
      { name: "Materials Science", slug: "materials-science" },
      { name: "Aerospace Engineering", slug: "aerospace-engineering" },
    ],
  },
  {
    name: "Environmental Sciences",
    slug: "environmental-sciences",
    children: [
      { name: "Climate Science", slug: "climate-science" },
      { name: "Environmental Engineering", slug: "environmental-engineering" },
      { name: "Earth Sciences", slug: "earth-sciences" },
      { name: "Oceanography", slug: "oceanography" },
      { name: "Geography", slug: "geography" },
    ],
  },
  {
    name: "Social Sciences",
    slug: "social-sciences",
    children: [
      { name: "Psychology", slug: "psychology" },
      { name: "Sociology", slug: "sociology" },
      { name: "Economics", slug: "economics" },
      { name: "Political Science", slug: "political-science" },
      { name: "Anthropology", slug: "anthropology" },
      { name: "Linguistics", slug: "linguistics" },
      { name: "Education", slug: "education" },
      { name: "Communication & Media Studies", slug: "communication-media-studies" },
    ],
  },
  {
    name: "Humanities",
    slug: "humanities",
    children: [
      { name: "Philosophy", slug: "philosophy" },
      { name: "History", slug: "history" },
      { name: "Literature", slug: "literature" },
      { name: "Art History", slug: "art-history" },
      { name: "Religious Studies", slug: "religious-studies" },
      { name: "Music & Performing Arts", slug: "music-performing-arts" },
    ],
  },
  {
    name: "Information Science",
    slug: "information-science",
    children: [
      { name: "Library Science", slug: "library-science" },
      { name: "Information Systems", slug: "information-systems" },
      { name: "Digital Humanities", slug: "digital-humanities" },
      { name: "Scholarly Communication", slug: "scholarly-communication" },
    ],
  },
  {
    name: "Agriculture & Food Sciences",
    slug: "agriculture-food-sciences",
    children: [
      { name: "Agronomy", slug: "agronomy" },
      { name: "Food Science", slug: "food-science" },
      { name: "Animal Science", slug: "animal-science" },
      { name: "Soil Science", slug: "soil-science" },
      { name: "Veterinary Science", slug: "veterinary-science" },
    ],
  },
  {
    name: "Architecture & Urban Planning",
    slug: "architecture-urban-planning",
    children: [
      { name: "Architecture", slug: "architecture" },
      { name: "Urban Planning", slug: "urban-planning" },
      { name: "Landscape Architecture", slug: "landscape-architecture" },
    ],
  },
  {
    name: "Law",
    slug: "law",
    children: [
      { name: "International Law", slug: "international-law" },
      { name: "Constitutional Law", slug: "constitutional-law" },
      { name: "Criminal Law", slug: "criminal-law" },
      { name: "Intellectual Property", slug: "intellectual-property" },
    ],
  },
  {
    name: "Business & Management",
    slug: "business-management",
    children: [
      { name: "Finance", slug: "finance" },
      { name: "Marketing", slug: "marketing" },
      { name: "Operations Management", slug: "operations-management" },
      { name: "Organizational Behavior", slug: "organizational-behavior" },
    ],
  },
  {
    name: "Other",
    slug: "other",
    children: [
      { name: "Interdisciplinary Studies", slug: "interdisciplinary-studies" },
      { name: "Other / General", slug: "other-general" },
    ],
  },
];

export function flattenDisciplines(
  disciplines: Discipline[] = DISCIPLINES
): Omit<Discipline, "children">[] {
  const result: Omit<Discipline, "children">[] = [];
  for (const d of disciplines) {
    result.push({ name: d.name, slug: d.slug });
    if (d.children) {
      result.push(...flattenDisciplines(d.children));
    }
  }
  return result;
}
