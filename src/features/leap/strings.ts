// User-facing strings for the LEAP page. LEAP is future scope (D-031): NextStep will integrate with the
// LEAP team's own platform, so this page only explains what is coming.
export const leapStrings = {
  title: "LEAP programs",
  badge: "Coming soon",
  heading: "LEAP is coming to NextStep",
  intro:
    "LEAP is our community's career initiative. We will integrate NextStep with the LEAP program, so you will be able to browse programs, enrol and track your progress right here.",
  stagesHeading: "The LEAP journey",
  stages: [
    { letter: "L", name: "Learn", body: "Build skills in short sprints and courses, such as a 4-week Python sprint." },
    { letter: "E", name: "Engage", body: "Get paired with an experienced professional for regular advice." },
    { letter: "A", name: "Apply", body: "Put what you learned into a real project." },
    { letter: "P", name: "Progress", body: "Meet hiring partners for an interview when you complete the program." },
  ],
  meanwhileHeading: "In the meantime",
  meanwhile: "You can already book a session with a mentor or look for jobs with LEAP-friendly employers.",
  findMentor: "Find a mentor",
  browseJobs: "Browse LEAP-friendly jobs",
} as const;
