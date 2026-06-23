export type ResourceKind = "template" | "handout" | "appendix";

export type ResourceItem = {
  id: string;
  kind: ResourceKind;
  title: string;
  description: string;
  pages: string;
  href: string;
  preview: string;
  keywords: string[];
};

export const handoutResources: ResourceItem[] = [
  {
    id: "template-01-general-child-observation",
    kind: "template",
    title: "General Child Observation Form",
    description:
      "A structured template for recording objective facts about a child, setting, time, and observed patterns.",
    pages: "2 pages",
    href: "/resources/handouts/template-01-general-child-observation.pdf",
    preview: "/previews/handouts/template-01-general-child-observation.png",
    keywords: ["observation", "facts", "documentation", "template"],
  },
  {
    id: "template-02-abc-behavior-observation",
    kind: "template",
    title: "ABC Behavior Observation Form",
    description:
      "Documents antecedent, behavior, and consequence patterns using neutral, observable language.",
    pages: "2 pages",
    href: "/resources/handouts/template-02-abc-behavior-observation.pdf",
    preview: "/previews/handouts/template-02-abc-behavior-observation.png",
    keywords: ["abc", "behavior", "antecedent", "consequence"],
  },
  {
    id: "template-03-frequency-count",
    kind: "template",
    title: "Frequency Count Form",
    description:
      "Tracks how often a specific behavior or event occurs across routines and time blocks.",
    pages: "2 pages",
    href: "/resources/handouts/template-03-frequency-count.pdf",
    preview: "/previews/handouts/template-03-frequency-count.png",
    keywords: ["frequency", "tracking", "patterns", "count"],
  },
  {
    id: "template-04-transition-observation",
    kind: "template",
    title: "Transition Observation Form",
    description:
      "Captures a child's response during activity changes, routines, arrival, dismissal, and cleanup.",
    pages: "2 pages",
    href: "/resources/handouts/template-04-transition-observation.pdf",
    preview: "/previews/handouts/template-04-transition-observation.png",
    keywords: ["transition", "routine", "arrival", "dismissal"],
  },
  {
    id: "template-05-social-emotional-observation",
    kind: "template",
    title: "Social-Emotional Observation Form",
    description:
      "Supports documentation of self-regulation, peer relationships, emotional expression, and strengths.",
    pages: "2 pages",
    href: "/resources/handouts/template-05-social-emotional-observation.pdf",
    preview: "/previews/handouts/template-05-social-emotional-observation.png",
    keywords: ["social emotional", "relationships", "regulation"],
  },
  {
    id: "template-06-communication-observation",
    kind: "template",
    title: "Communication Observation Form",
    description:
      "Records expressive and receptive communication, gestures, language attempts, and supports used.",
    pages: "2 pages",
    href: "/resources/handouts/template-06-communication-observation.pdf",
    preview: "/previews/handouts/template-06-communication-observation.png",
    keywords: ["communication", "language", "gestures", "speech"],
  },
  {
    id: "template-07-sensory-processing-observation",
    kind: "template",
    title: "Sensory Processing Observation Form",
    description:
      "Helps document environmental sensory input and the child's observable response without labeling.",
    pages: "2 pages",
    href: "/resources/handouts/template-07-sensory-processing-observation.pdf",
    preview: "/previews/handouts/template-07-sensory-processing-observation.png",
    keywords: ["sensory", "environment", "response", "input"],
  },
  {
    id: "template-08-physical-mobility-observation",
    kind: "template",
    title: "Physical or Mobility Observation Form",
    description:
      "Captures gross motor, fine motor, and physical participation observations with needed supports.",
    pages: "2 pages",
    href: "/resources/handouts/template-08-physical-mobility-observation.pdf",
    preview: "/previews/handouts/template-08-physical-mobility-observation.png",
    keywords: ["physical", "mobility", "motor", "fine motor"],
  },
  {
    id: "template-09-attention-learning-observation",
    kind: "template",
    title: "Attention and Learning Observation Form",
    description:
      "Records focus, task completion, engagement, learning approaches, and strategies that helped.",
    pages: "2 pages",
    href: "/resources/handouts/template-09-attention-learning-observation.pdf",
    preview: "/previews/handouts/template-09-attention-learning-observation.png",
    keywords: ["attention", "learning", "focus", "engagement"],
  },
  {
    id: "documentation-examples-subjective-vs-objective",
    kind: "handout",
    title: "Documentation Examples: Subjective vs. Objective Language",
    description:
      "Side-by-side examples for turning labels, judgments, and assumptions into factual documentation.",
    pages: "3 pages",
    href: "/resources/handouts/documentation-examples-subjective-vs-objective.pdf",
    preview: "/previews/handouts/documentation-examples-subjective-vs-objective.png",
    keywords: ["objective", "subjective", "examples", "documentation"],
  },
  {
    id: "conversation-planning-worksheet",
    kind: "template",
    title: "Conversation Planning Worksheet",
    description:
      "A preparation worksheet for strengths, observations, family questions, supports, and follow-up.",
    pages: "4 pages",
    href: "/resources/handouts/conversation-planning-worksheet.pdf",
    preview: "/previews/handouts/conversation-planning-worksheet.png",
    keywords: ["conversation", "planning", "worksheet", "family"],
  },
  {
    id: "local-state-support-services-ny",
    kind: "handout",
    title: "Local and State Support Services List - New York State",
    description:
      "Customizable referral and support contact list for EI, CPSE, health, OCFS, NYSED, and family supports.",
    pages: "4 pages",
    href: "/resources/handouts/local-state-support-services-ny.pdf",
    preview: "/previews/handouts/local-state-support-services-ny.png",
    keywords: ["support", "services", "new york", "referral", "cpse", "ei"],
  },
  {
    id: "handout-01-objective-observation-vs-opinion",
    kind: "handout",
    title: "Objective Observation vs. Opinion",
    description:
      "Reference and practice activity for identifying objective language and rewriting opinion statements.",
    pages: "3 pages",
    href: "/resources/handouts/handout-01-objective-observation-vs-opinion.pdf",
    preview: "/previews/handouts/handout-01-objective-observation-vs-opinion.png",
    keywords: ["objective", "opinion", "practice", "activity"],
  },
  {
    id: "handout-02-child-observation-documentation-template",
    kind: "template",
    title: "Child Observation Documentation Template",
    description:
      "Printable template for documenting an individual observation, ABC details, supports, and follow-up.",
    pages: "2 pages",
    href: "/resources/handouts/handout-02-child-observation-documentation-template.pdf",
    preview: "/previews/handouts/handout-02-child-observation-documentation-template.png",
    keywords: ["child observation", "documentation", "abc", "template"],
  },
  {
    id: "handout-03-conversation-planning-guide",
    kind: "handout",
    title: "Conversation Planning Guide",
    description:
      "Step-by-step guidance for opening, framing, responding, and closing family conversations.",
    pages: "2 pages",
    href: "/resources/handouts/handout-03-conversation-planning-guide.pdf",
    preview: "/previews/handouts/handout-03-conversation-planning-guide.png",
    keywords: ["conversation", "families", "guide", "next steps"],
  },
  {
    id: "handout-04-strengths-based-language-cheat-sheet",
    kind: "handout",
    title: "Strengths-Based Language Cheat Sheet",
    description:
      "Professional phrases for leading with strengths, asking questions, expressing concern, and recommending supports.",
    pages: "2 pages",
    href: "/resources/handouts/handout-04-strengths-based-language-cheat-sheet.pdf",
    preview: "/previews/handouts/handout-04-strengths-based-language-cheat-sheet.png",
    keywords: ["strengths", "language", "phrases", "families"],
  },
  {
    id: "handout-05-local-referral-support-resource-list-ny",
    kind: "handout",
    title: "Local Referral and Support Resource List - New York State",
    description:
      "Family-facing referral resource list with local contact fields for programs to complete before sharing.",
    pages: "4 pages",
    href: "/resources/handouts/handout-05-local-referral-support-resource-list-ny.pdf",
    preview: "/previews/handouts/handout-05-local-referral-support-resource-list-ny.png",
    keywords: ["referral", "support", "family", "new york", "resources"],
  },
];

export const appendixResources: ResourceItem[] = [
  {
    id: "appendix-01-observable-behaviors-actions",
    kind: "appendix",
    title: "Observable Behaviors & Actions",
    description:
      "Objective verbs and phrases for describing movement, social actions, communication, and daily routines.",
    pages: "2 pages",
    href: "/resources/appendix/appendix-01-observable-behaviors-actions.pdf",
    preview: "/previews/appendix/appendix-01-observable-behaviors-actions.png",
    keywords: ["observable", "behavior", "actions", "verbs"],
  },
  {
    id: "appendix-02-social-emotional-development",
    kind: "appendix",
    title: "Social-Emotional Development",
    description:
      "Language for documenting emotional responses, self-regulation, relationships, and adult support.",
    pages: "2 pages",
    href: "/resources/appendix/appendix-02-social-emotional-development.pdf",
    preview: "/previews/appendix/appendix-02-social-emotional-development.png",
    keywords: ["social emotional", "regulation", "relationships"],
  },
  {
    id: "appendix-03-communication-language",
    kind: "appendix",
    title: "Communication & Language",
    description:
      "Objective language for expressive, receptive, nonverbal, and social communication observations.",
    pages: "2 pages",
    href: "/resources/appendix/appendix-03-communication-language.pdf",
    preview: "/previews/appendix/appendix-03-communication-language.png",
    keywords: ["communication", "language", "gestures", "pragmatics"],
  },
  {
    id: "appendix-04-sensory-inputs",
    kind: "appendix",
    title: "Sensory Inputs",
    description:
      "Terms for documenting sounds, visual conditions, tactile materials, movement, smell, and taste.",
    pages: "2 pages",
    href: "/resources/appendix/appendix-04-sensory-inputs.pdf",
    preview: "/previews/appendix/appendix-04-sensory-inputs.png",
    keywords: ["sensory", "inputs", "environment", "auditory", "visual"],
  },
  {
    id: "appendix-05-sensory-responses-outputs",
    kind: "appendix",
    title: "Sensory Responses & Outputs",
    description:
      "Language for describing how a child responds to sensory experiences without diagnostic labels.",
    pages: "2 pages",
    href: "/resources/appendix/appendix-05-sensory-responses-outputs.pdf",
    preview: "/previews/appendix/appendix-05-sensory-responses-outputs.png",
    keywords: ["sensory", "responses", "seeking", "avoidance"],
  },
  {
    id: "appendix-06-attention-learning",
    kind: "appendix",
    title: "Attention & Learning",
    description:
      "Objective terms for engagement, task completion, following directions, memory, and learning support.",
    pages: "2 pages",
    href: "/resources/appendix/appendix-06-attention-learning.pdf",
    preview: "/previews/appendix/appendix-06-attention-learning.png",
    keywords: ["attention", "learning", "engagement", "directions"],
  },
  {
    id: "appendix-07-physical-motor-development",
    kind: "appendix",
    title: "Physical & Motor Development",
    description:
      "Language for gross motor, fine motor, adaptive, participation, stamina, and positioning observations.",
    pages: "2 pages",
    href: "/resources/appendix/appendix-07-physical-motor-development.pdf",
    preview: "/previews/appendix/appendix-07-physical-motor-development.png",
    keywords: ["physical", "motor", "mobility", "fine motor"],
  },
  {
    id: "appendix-08-transition-routine-responses",
    kind: "appendix",
    title: "Transition & Routine Responses",
    description:
      "Terms for documenting how children move through daily routines, warnings, visuals, and supports.",
    pages: "1 page",
    href: "/resources/appendix/appendix-08-transition-routine-responses.pdf",
    preview: "/previews/appendix/appendix-08-transition-routine-responses.png",
    keywords: ["transition", "routine", "visual schedule", "support"],
  },
  {
    id: "appendix-09-peer-interaction",
    kind: "appendix",
    title: "Peer Interaction",
    description:
      "Objective terms for proximity, awareness, cooperative play, conflict, repair, and peer communication.",
    pages: "1 page",
    href: "/resources/appendix/appendix-09-peer-interaction.pdf",
    preview: "/previews/appendix/appendix-09-peer-interaction.png",
    keywords: ["peers", "interaction", "play", "conflict"],
  },
  {
    id: "appendix-10-adult-interaction-response",
    kind: "appendix",
    title: "Adult Interaction & Response",
    description:
      "Language for documenting adult support seeking, proximity, prompts, redirection, and response patterns.",
    pages: "1 page",
    href: "/resources/appendix/appendix-10-adult-interaction-response.pdf",
    preview: "/previews/appendix/appendix-10-adult-interaction-response.png",
    keywords: ["adult", "interaction", "support", "redirection"],
  },
  {
    id: "appendix-11-emotional-expression",
    kind: "appendix",
    title: "Emotional Expression",
    description:
      "Positively framed language for documenting observable signs of joy, frustration, sadness, pride, and worry.",
    pages: "2 pages",
    href: "/resources/appendix/appendix-11-emotional-expression.pdf",
    preview: "/previews/appendix/appendix-11-emotional-expression.png",
    keywords: ["emotion", "expression", "joy", "frustration", "worry"],
  },
  {
    id: "appendix-12-strengths-positive-descriptors",
    kind: "appendix",
    title: "Strengths & Positive Descriptors",
    description:
      "Strength-based language for character, learning, social, communication, motor, and regulation strengths.",
    pages: "2 pages",
    href: "/resources/appendix/appendix-12-strengths-positive-descriptors.pdf",
    preview: "/previews/appendix/appendix-12-strengths-positive-descriptors.png",
    keywords: ["strengths", "positive", "descriptors", "family"],
  },
  {
    id: "appendix-13-strategies-supports-documentation-phrases",
    kind: "appendix",
    title: "Strategies, Supports & Documentation Phrases",
    description:
      "Terms for supports plus ready-to-use sentence starters for observations, patterns, family notes, and follow-up.",
    pages: "4 pages",
    href: "/resources/appendix/appendix-13-strategies-supports-documentation-phrases.pdf",
    preview:
      "/previews/appendix/appendix-13-strategies-supports-documentation-phrases.png",
    keywords: [
      "strategies",
      "supports",
      "sentence starters",
      "documentation",
      "family collaboration",
    ],
  },
];

export const allResources = [...handoutResources, ...appendixResources];

export function findResource(id: string) {
  return allResources.find((resource) => resource.id === id);
}
