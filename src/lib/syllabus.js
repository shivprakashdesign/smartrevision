// Hardcoded syllabus tree — the fast-start picker that sits ALONGSIDE photo-scan
// and manual add (it never replaces them). Filtered to the student's board +
// class + chosen subjects at runtime, so "other class / other subject" data is
// never shown. This is the reference data behind the weighted study plan.
//
// SCOPE (v1): Class 12 CBSE, Physics / Chemistry / Maths. The shape supports
// adding Class 11/10/9 and other subjects later without touching the engine.
//
// TWO IMPORTANCE LENSES, shown side by side for clarity:
//   `jeeQ`       — average JEE Main questions a chapter draws per session (out
//                  of ~25 for the subject). The weight the engine uses under the
//                  JEE lens. Source: public JEE Main chapter-wise weightage
//                  (eSaral / PW / Testbook, 2025–26).
//   `boardMarks` — CBSE Class 12 board marks the chapter carries (Physics /
//                  Chemistry out of 70, Maths out of 80). Board marks are
//                  officially UNIT-level; where a unit spans chapters we split
//                  its marks across them. Source: PW / CollegeDekho (2025–26).
//
// Both are session/year-averaged priors to be tuned, not gospel — they fluctuate.
//
// SYLLABUS DRIFT — the 2023 NCERT rationalization and the 2024 JEE syllabus cut
// diverged, so a few chapters live in one lens but not the other:
//   `jeeExcluded: true`   — in CBSE Class 12 but dropped from the JEE syllabus.
//   `boardExcluded: true` — in the JEE syllabus but dropped from CBSE Class 12.
// Chapters dropped from BOTH (Solid State, Surface Chemistry, Isolation of
// Elements, Polymers, Chemistry in Everyday Life) are omitted entirely — they'd
// be dead weight in the picker. p-Block is the one live split: JEE keeps it,
// CBSE boards no longer test it.
//
// Subtopic `type` drives the per-item difficulty weight in the engine, mirroring
// the student's own tracker: Derivation / Numerical are heavy, MCQ light.

export const SUBTOPIC_TYPES = ['Derivation', 'Concept', 'Numerical', 'MCQ']

export const SYLLABUS = {
  CBSE: {
    12: {
      Physics: [
        { id: 'p1', chapter: 'Electric Charges & Fields', jeeQ: 1, boardMarks: 5, subtopics: [
          { id: 'p1a', label: "Coulomb's law", type: 'Derivation' },
          { id: 'p1b', label: 'Electric field & field lines', type: 'Concept' },
          { id: 'p1c', label: 'Electric dipole & torque', type: 'Derivation' },
          { id: 'p1d', label: "Gauss's law & applications", type: 'Derivation' },
          { id: 'p1e', label: 'Force / field numericals', type: 'Numerical' }
        ]},
        { id: 'p2', chapter: 'Electrostatic Potential & Capacitance', jeeQ: 1, boardMarks: 5, subtopics: [
          { id: 'p2a', label: 'Potential due to charge & dipole', type: 'Derivation' },
          { id: 'p2b', label: 'Equipotential surfaces, E = -dV/dr', type: 'Concept' },
          { id: 'p2c', label: 'Capacitors, series & parallel', type: 'Numerical' },
          { id: 'p2d', label: 'Energy stored, dielectrics', type: 'Numerical' }
        ]},
        { id: 'p3', chapter: 'Current Electricity', jeeQ: 3, boardMarks: 6, subtopics: [
          { id: 'p3a', label: 'Ohm’s law, drift velocity', type: 'Concept' },
          { id: 'p3b', label: "Kirchhoff's laws", type: 'Derivation' },
          { id: 'p3c', label: 'Wheatstone bridge & meter bridge', type: 'Derivation' },
          { id: 'p3d', label: 'Potentiometer', type: 'Concept' },
          { id: 'p3e', label: 'Resistance networks, EMF & internal R', type: 'Numerical' }
        ]},
        { id: 'p4', chapter: 'Moving Charges & Magnetism', jeeQ: 2, boardMarks: 8, subtopics: [
          { id: 'p4a', label: 'Biot–Savart & Ampere’s law', type: 'Derivation' },
          { id: 'p4b', label: 'Force on charge / wire, cyclotron', type: 'Concept' },
          { id: 'p4c', label: 'Torque on loop, moving-coil galvanometer', type: 'Derivation' },
          { id: 'p4d', label: 'Field numericals', type: 'Numerical' }
        ]},
        { id: 'p5', chapter: 'Magnetism & Matter', jeeQ: 1, boardMarks: 3, subtopics: [
          { id: 'p5a', label: 'Bar magnet, magnetic dipole', type: 'Concept' },
          { id: 'p5b', label: 'Dia / para / ferromagnetism', type: 'Concept' },
          { id: 'p5c', label: 'Hysteresis, earth’s magnetism', type: 'Concept' }
        ]},
        { id: 'p6', chapter: 'Electromagnetic Induction', jeeQ: 1, boardMarks: 3, subtopics: [
          { id: 'p6a', label: 'Faraday & Lenz law, motional EMF', type: 'Derivation' },
          { id: 'p6b', label: 'Self & mutual inductance', type: 'Derivation' },
          { id: 'p6c', label: 'Energy in inductor, AC generator', type: 'Concept' },
          { id: 'p6d', label: 'Induced EMF numericals', type: 'Numerical' }
        ]},
        { id: 'p7', chapter: 'Alternating Current', jeeQ: 2, boardMarks: 3, subtopics: [
          { id: 'p7a', label: 'AC through R, L, C', type: 'Concept' },
          { id: 'p7b', label: 'LCR circuit, phasors, impedance', type: 'Derivation' },
          { id: 'p7c', label: 'Resonance, quality factor', type: 'Concept' },
          { id: 'p7d', label: 'Power, transformer', type: 'Numerical' }
        ]},
        { id: 'p8', chapter: 'Electromagnetic Waves', jeeQ: 1, boardMarks: 4, subtopics: [
          { id: 'p8a', label: 'Displacement current', type: 'Concept' },
          { id: 'p8b', label: 'EM wave properties', type: 'Concept' },
          { id: 'p8c', label: 'EM spectrum', type: 'MCQ' }
        ]},
        { id: 'p9', chapter: 'Ray Optics & Optical Instruments', jeeQ: 2, boardMarks: 8, subtopics: [
          { id: 'p9a', label: 'Reflection, mirrors', type: 'Numerical' },
          { id: 'p9b', label: 'Refraction, lens & lensmaker', type: 'Derivation' },
          { id: 'p9c', label: 'Prism, dispersion, TIR', type: 'Concept' },
          { id: 'p9d', label: 'Microscope & telescope', type: 'Numerical' }
        ]},
        { id: 'p10', chapter: 'Wave Optics', jeeQ: 2, boardMarks: 6, subtopics: [
          { id: 'p10a', label: "Huygens principle", type: 'Concept' },
          { id: 'p10b', label: 'Young’s double slit', type: 'Derivation' },
          { id: 'p10c', label: 'Diffraction, single slit', type: 'Concept' },
          { id: 'p10d', label: 'Polarisation', type: 'MCQ' }
        ]},
        { id: 'p11', chapter: 'Dual Nature of Radiation & Matter', jeeQ: 1, boardMarks: 4, subtopics: [
          { id: 'p11a', label: 'Photoelectric effect', type: 'Concept' },
          { id: 'p11b', label: 'Einstein’s equation', type: 'Numerical' },
          { id: 'p11c', label: 'de Broglie wavelength', type: 'Numerical' }
        ]},
        { id: 'p12', chapter: 'Atoms', jeeQ: 1, boardMarks: 4, subtopics: [
          { id: 'p12a', label: 'Bohr model', type: 'Derivation' },
          { id: 'p12b', label: 'Hydrogen spectrum', type: 'Numerical' },
          { id: 'p12c', label: 'Rutherford scattering', type: 'Concept' }
        ]},
        { id: 'p13', chapter: 'Nuclei', jeeQ: 1, boardMarks: 4, subtopics: [
          { id: 'p13a', label: 'Mass defect & binding energy', type: 'Numerical' },
          { id: 'p13b', label: 'Radioactivity, decay law', type: 'Derivation' },
          { id: 'p13c', label: 'Fission & fusion', type: 'Concept' }
        ]},
        { id: 'p14', chapter: 'Semiconductor Electronics', jeeQ: 1, boardMarks: 7, subtopics: [
          { id: 'p14a', label: 'Intrinsic / extrinsic, p-n junction', type: 'Concept' },
          { id: 'p14b', label: 'Diode, rectifier', type: 'Concept' },
          { id: 'p14c', label: 'Logic gates', type: 'MCQ' }
        ]}
      ],
      Chemistry: [
        { id: 'c2', chapter: 'Solutions', jeeQ: 1, boardMarks: 7, subtopics: [
          { id: 'c2a', label: "Raoult's law", type: 'Concept' },
          { id: 'c2b', label: 'Colligative properties', type: 'Concept' },
          { id: 'c2c', label: "van't Hoff factor", type: 'Concept' },
          { id: 'c2d', label: 'Elevation / depression / osmosis', type: 'Numerical' }
        ]},
        { id: 'c3', chapter: 'Electrochemistry', jeeQ: 1, boardMarks: 9, subtopics: [
          { id: 'c3a', label: 'Nernst equation', type: 'Derivation' },
          { id: 'c3b', label: 'Conductance, Kohlrausch law', type: 'Concept' },
          { id: 'c3c', label: 'EMF of cell, Faraday’s laws', type: 'Numerical' }
        ]},
        { id: 'c4', chapter: 'Chemical Kinetics', jeeQ: 1, boardMarks: 7, subtopics: [
          { id: 'c4a', label: 'Rate law, order & molecularity', type: 'Concept' },
          { id: 'c4b', label: 'Integrated rate (1st order), half-life', type: 'Derivation' },
          { id: 'c4c', label: 'Arrhenius equation', type: 'Numerical' }
        ]},
        { id: 'c7', chapter: 'The p-Block Elements', jeeQ: 2, boardMarks: 0, boardExcluded: true, subtopics: [
          { id: 'c7a', label: 'Group 15 (N family)', type: 'Concept' },
          { id: 'c7b', label: 'Group 16 (O family)', type: 'Concept' },
          { id: 'c7c', label: 'Group 17 & 18', type: 'Concept' },
          { id: 'c7d', label: 'Oxoacids, structures', type: 'MCQ' }
        ]},
        { id: 'c8', chapter: 'The d & f Block Elements', jeeQ: 2, boardMarks: 7, subtopics: [
          { id: 'c8a', label: 'Transition element trends', type: 'Concept' },
          { id: 'c8b', label: 'KMnO4 / K2Cr2O7', type: 'Concept' },
          { id: 'c8c', label: 'Lanthanoid contraction', type: 'MCQ' }
        ]},
        { id: 'c9', chapter: 'Coordination Compounds', jeeQ: 2, boardMarks: 7, subtopics: [
          { id: 'c9a', label: 'Nomenclature, Werner theory', type: 'Concept' },
          { id: 'c9b', label: 'VBT, CFT, hybridisation', type: 'Concept' },
          { id: 'c9c', label: 'Isomerism', type: 'MCQ' },
          { id: 'c9d', label: 'Magnetic moment / colour', type: 'Numerical' }
        ]},
        { id: 'c10', chapter: 'Haloalkanes & Haloarenes', jeeQ: 1, boardMarks: 6, subtopics: [
          { id: 'c10a', label: 'SN1 vs SN2', type: 'Concept' },
          { id: 'c10b', label: 'Elimination, reactivity order', type: 'Concept' },
          { id: 'c10c', label: 'Optical isomerism (R/S)', type: 'MCQ' }
        ]},
        { id: 'c11', chapter: 'Alcohols, Phenols & Ethers', jeeQ: 1, boardMarks: 6, subtopics: [
          { id: 'c11a', label: 'Preparation & properties', type: 'Concept' },
          { id: 'c11b', label: 'Reactions of phenol', type: 'Concept' },
          { id: 'c11c', label: 'Named reactions (Reimer–Tiemann, Kolbe)', type: 'MCQ' }
        ]},
        { id: 'c12', chapter: 'Aldehydes, Ketones & Carboxylic Acids', jeeQ: 2, boardMarks: 8, subtopics: [
          { id: 'c12a', label: 'Nucleophilic addition', type: 'Concept' },
          { id: 'c12b', label: 'Aldol, Cannizzaro', type: 'Concept' },
          { id: 'c12c', label: 'Acidity of carboxylic acids', type: 'Concept' },
          { id: 'c12d', label: 'Distinguishing tests', type: 'MCQ' }
        ]},
        { id: 'c13', chapter: 'Amines', jeeQ: 1, boardMarks: 6, subtopics: [
          { id: 'c13a', label: 'Classification, basicity', type: 'Concept' },
          { id: 'c13b', label: 'Preparation, diazonium salts', type: 'Concept' },
          { id: 'c13c', label: 'Distinguishing 1°/2°/3°', type: 'MCQ' }
        ]},
        { id: 'c14', chapter: 'Biomolecules', jeeQ: 1, boardMarks: 7, subtopics: [
          { id: 'c14a', label: 'Carbohydrates', type: 'Concept' },
          { id: 'c14b', label: 'Proteins, enzymes', type: 'Concept' },
          { id: 'c14c', label: 'Nucleic acids, vitamins', type: 'MCQ' }
        ]}
      ],
      Maths: [
        { id: 'm1', chapter: 'Relations & Functions', jeeQ: 1, boardMarks: 5, subtopics: [
          { id: 'm1a', label: 'Types of relations', type: 'Concept' },
          { id: 'm1b', label: 'One-one, onto, bijective, inverse', type: 'Concept' },
          { id: 'm1c', label: 'Composition, binary operations', type: 'Numerical' }
        ]},
        { id: 'm2', chapter: 'Inverse Trigonometric Functions', jeeQ: 1, boardMarks: 3, subtopics: [
          { id: 'm2a', label: 'Domain, range, principal value', type: 'Concept' },
          { id: 'm2b', label: 'Properties, simplification', type: 'Numerical' }
        ]},
        { id: 'm3', chapter: 'Matrices', jeeQ: 1, boardMarks: 5, subtopics: [
          { id: 'm3a', label: 'Types & operations', type: 'Concept' },
          { id: 'm3b', label: 'Transpose, symmetric / skew', type: 'Concept' },
          { id: 'm3c', label: 'Inverse by elementary operations', type: 'Numerical' }
        ]},
        { id: 'm4', chapter: 'Determinants', jeeQ: 1, boardMarks: 5, subtopics: [
          { id: 'm4a', label: 'Properties of determinants', type: 'Derivation' },
          { id: 'm4b', label: 'Adjoint & inverse', type: 'Concept' },
          { id: 'm4c', label: 'System of equations, Cramer', type: 'Numerical' }
        ]},
        { id: 'm5', chapter: 'Continuity & Differentiability', jeeQ: 2, boardMarks: 8, subtopics: [
          { id: 'm5a', label: 'Continuity, find k', type: 'Numerical' },
          { id: 'm5b', label: 'Chain rule, implicit, log diff', type: 'Numerical' },
          { id: 'm5c', label: 'Rolle’s & MVT', type: 'Concept' }
        ]},
        { id: 'm6', chapter: 'Application of Derivatives', jeeQ: 2, boardMarks: 7, subtopics: [
          { id: 'm6a', label: 'Rate of change, approximation', type: 'Numerical' },
          { id: 'm6b', label: 'Increasing / decreasing', type: 'Concept' },
          { id: 'm6c', label: 'Maxima & minima', type: 'Numerical' },
          { id: 'm6d', label: 'Tangents & normals', type: 'Numerical' }
        ]},
        { id: 'm7', chapter: 'Integrals', jeeQ: 2, boardMarks: 10, subtopics: [
          { id: 'm7a', label: 'By substitution & parts (ILATE)', type: 'Numerical' },
          { id: 'm7b', label: 'Partial fractions', type: 'Numerical' },
          { id: 'm7c', label: 'Definite integral properties', type: 'Derivation' },
          { id: 'm7d', label: 'Definite integrals', type: 'Numerical' }
        ]},
        { id: 'm8', chapter: 'Application of Integrals', jeeQ: 1, boardMarks: 4, subtopics: [
          { id: 'm8a', label: 'Area under a curve', type: 'Numerical' },
          { id: 'm8b', label: 'Area between curves', type: 'Numerical' }
        ]},
        { id: 'm9', chapter: 'Differential Equations', jeeQ: 1, boardMarks: 6, subtopics: [
          { id: 'm9a', label: 'Order & degree', type: 'Concept' },
          { id: 'm9b', label: 'Variable separable, homogeneous', type: 'Numerical' },
          { id: 'm9c', label: 'Linear differential equations', type: 'Numerical' }
        ]},
        { id: 'm10', chapter: 'Vector Algebra', jeeQ: 2, boardMarks: 6, subtopics: [
          { id: 'm10a', label: 'Dot & cross product', type: 'Numerical' },
          { id: 'm10b', label: 'Scalar & vector triple product', type: 'Concept' },
          { id: 'm10c', label: 'Projection, area', type: 'Numerical' }
        ]},
        { id: 'm11', chapter: 'Three Dimensional Geometry', jeeQ: 2, boardMarks: 8, subtopics: [
          { id: 'm11a', label: 'Direction cosines & ratios', type: 'Concept' },
          { id: 'm11b', label: 'Line in space, shortest distance', type: 'Numerical' },
          { id: 'm11c', label: 'Plane, angle & distance', type: 'Numerical' }
        ]},
        { id: 'm12', chapter: 'Linear Programming', jeeQ: 1, boardMarks: 5, subtopics: [
          { id: 'm12a', label: 'Formulation, feasible region', type: 'Concept' },
          { id: 'm12b', label: 'Optimal solution (graphical)', type: 'Numerical' }
        ]},
        { id: 'm13', chapter: 'Probability', jeeQ: 2, boardMarks: 8, subtopics: [
          { id: 'm13a', label: 'Conditional probability', type: 'Numerical' },
          { id: 'm13b', label: "Bayes' theorem", type: 'Numerical' },
          { id: 'm13c', label: 'Random variable, distributions', type: 'Concept' }
        ]}
      ]
    }
  }
}

// Boards / classes / subjects that actually have hardcoded data, for the picker
// to offer. Anything not here falls back to scan / manual add.
export const SYLLABUS_BOARDS = Object.keys(SYLLABUS)

export function syllabusClasses(board) {
  return Object.keys(SYLLABUS[board] || {}).map(Number).sort((a, b) => b - a)
}

export function syllabusSubjects(board, cls) {
  return Object.keys(SYLLABUS[board]?.[cls] || {})
}

// The chapters for one board+class+subject, or [] when we have no hardcoded
// data — the caller then points the student at scan / manual add instead.
export function chaptersFor(board, cls, subject) {
  return SYLLABUS[board]?.[cls]?.[subject] || []
}

// Does the hardcoded tree cover this combination at all?
export function hasSyllabus(board, cls, subject) {
  return chaptersFor(board, cls, subject).length > 0
}

// The tree chapter behind a plan_item's (subject, chapter_name), or null when
// the plan_item came from a scan and isn't in the hardcoded syllabus. The picker
// writes exact chapter strings, so an exact match is enough.
export function chapterByName(board, cls, subject, name) {
  return chaptersFor(board, cls, subject).find(c => c.chapter === name) || null
}

// The importance weight for a chapter under a given lens ('jee' | 'board').
// The engine calls this so switching lenses is a one-line change everywhere.
export function chapterWeight(chapter, lens = 'jee') {
  return lens === 'board' ? (chapter.boardMarks || 0) : (chapter.jeeQ || 0)
}
