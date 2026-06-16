export interface Honorific {
  value: string;
  label: string;
}

export const HONORIFICS: Honorific[] = [
  { value: "Mr.", label: "Mr." },
  { value: "Mrs.", label: "Mrs." },
  { value: "Ms.", label: "Ms." },
  { value: "Dr.", label: "Dr." },
  { value: "Prof.", label: "Prof." },
  { value: "Assoc. Prof.", label: "Assoc. Prof." },
  { value: "Asst. Prof.", label: "Asst. Prof." },
  { value: "Rev.", label: "Rev." },
  { value: "Sir", label: "Sir" },
  { value: "Dame", label: "Dame" },
];
