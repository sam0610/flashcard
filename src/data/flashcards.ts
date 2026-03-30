export type Subject = 'Biology' | 'Chemistry' | 'Physics';

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

export const flashcardsData: Record<Subject, Flashcard[]> = {
  Biology: [
    { id: 'b1', question: 'What is the word equation for photosynthesis?', answer: 'Carbon dioxide + Water → Glucose + Oxygen (in the presence of light and chlorophyll)' },
    { id: 'b2', question: 'What is the balanced chemical equation for photosynthesis?', answer: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂' },
    { id: 'b3', question: 'What is the role of chlorophyll?', answer: 'It absorbs light energy required to convert carbon dioxide and water into glucose.' },
    { id: 'b4', question: 'Where does photosynthesis take place in a plant cell?', answer: 'Chloroplasts' },
    { id: 'b5', question: 'What are the three main limiting factors of photosynthesis?', answer: 'Light intensity, carbon dioxide concentration, and temperature.' },
  ],
  Chemistry: [
    { id: 'c1', question: 'What are the three subatomic particles?', answer: 'Protons, neutrons, and electrons.' },
    { id: 'c2', question: 'What is the relative charge and mass of a proton?', answer: 'Charge: +1, Mass: 1' },
    { id: 'c3', question: 'Define atomic number (proton number).', answer: 'The number of protons in the nucleus of an atom.' },
    { id: 'c4', question: 'Define mass number (nucleon number).', answer: 'The total number of protons and neutrons in the nucleus of an atom.' },
    { id: 'c5', question: 'What are isotopes?', answer: 'Atoms of the same element with the same number of protons but different numbers of neutrons.' },
  ],
  Physics: [
    { id: 'p1', question: 'What does the gradient (slope) of a velocity-time graph represent?', answer: 'Acceleration.' },
    { id: 'p2', question: 'What does a horizontal line on a velocity-time graph indicate?', answer: 'Constant velocity (zero acceleration).' },
    { id: 'p3', question: 'What does the area under a velocity-time graph represent?', answer: 'Distance travelled (displacement).' },
    { id: 'p4', question: 'How do you calculate acceleration from a velocity-time graph?', answer: 'Change in velocity ÷ time taken (gradient = Δy / Δx).' },
    { id: 'p5', question: 'What does a negative gradient on a velocity-time graph mean?', answer: 'Deceleration (slowing down).' },
  ]
};
