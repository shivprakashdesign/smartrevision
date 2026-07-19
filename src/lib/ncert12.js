// Class 12 chapter + topic tree, transcribed from the Gujarat Board (GSEB)
// Class 12 textbooks the student supplied (2026-07-19), replacing the earlier
// hand-authored subtopics with the books' real contents.
//
// PROVENANCE / SHARING: Physics, Chemistry and Maths are the NCERT titles (same
// chapter names and order as the national syllabus), so this tree serves BOTH
// GSEB and CBSE Class 12 — boards differ only in exam marks (BOARD_MARKS in
// syllabus.js). Biology and Computer Studies are GSEB-supplied too; Biology's
// chapter list matches NCERT Biology, but Computer Studies (KompoZer, HTML/CSS,
// e-commerce, Java, LaTeX) is a Gujarat state elective with no CBSE equivalent —
// stored faithfully, but don't assume it transfers to a CBSE student.
//
// CHEMISTRY HAS 10 CHAPTERS, NOT 11: the book has no standalone p-Block Elements
// chapter (JEE Main tests p-Block Groups 15–18 for Class 12 and 13–14 for Class
// 11, but neither the GSEB nor the rationalized NCERT textbook covers it as a
// chapter). A JEE aspirant needs a supplementary source for that topic — it's a
// real, honest gap in this book-sourced tree, not a modelling oversight. Chapter
// ids here are the book's own chapter numbers (c1..c10), which do NOT match the
// old c2/c3/c4/c8.. scheme from the hand-authored version.
//
// Rows: [chapterNumber, 'Chapter name', jeeQ, [[topicCode, 'Topic title'], …]]
//   `jeeQ` — avg JEE Main questions/session (national, board-independent).
//     null for Biology and Computer Studies: neither is examined by JEE.
//     Biology wants a NEET lens; Computer Studies has no competitive-exam lens
//     at all. Both fall back to the engine's floor weight (even split) and have
//     no board marks yet either — see BOARD_MARKS in syllabus.js.
//
// Chapters with no topic breakdown in the source book (Biology, Computer
// Studies both list "topics": []) get one fallback subtopic — the chapter name
// itself — via expandChapters(), so they still show up in every plan.
//
// Topics carry no difficulty `type` (same as Class 11), so the engine applies
// its Concept-level default weight.

import { expandChapters as expand } from './textbookRows'

const PHYSICS = [
  [1, 'Electric Charges and Fields', 1, [
    ['1.1', 'Introduction'],
    ['1.2', 'Electric Charge'],
    ['1.3', 'Conductors and Insulators'],
    ['1.4', 'Basic Properties of Electric Charge'],
    ['1.5', "Coulomb's Law"],
    ['1.6', 'Forces between Multiple Charges'],
    ['1.7', 'Electric Field'],
    ['1.8', 'Electric Field Lines'],
    ['1.9', 'Electric Flux'],
    ['1.10', 'Electric Dipole'],
    ['1.11', 'Dipole in a Uniform External Field'],
    ['1.12', 'Continuous Charge Distribution'],
    ['1.13', "Gauss's Law"],
    ['1.14', "Applications of Gauss's Law"]
  ]],
  [2, 'Electrostatic Potential and Capacitance', 1, [
    ['2.1', 'Introduction'],
    ['2.2', 'Electrostatic Potential'],
    ['2.3', 'Potential due to a Point Charge'],
    ['2.4', 'Potential due to an Electric Dipole'],
    ['2.5', 'Potential due to a System of Charges'],
    ['2.6', 'Equipotential Surfaces'],
    ['2.7', 'Potential Energy of a System of Charges'],
    ['2.8', 'Potential Energy in an External Field'],
    ['2.9', 'Electrostatics of Conductors'],
    ['2.10', 'Dielectrics and Polarisation'],
    ['2.11', 'Capacitors and Capacitance'],
    ['2.12', 'The Parallel Plate Capacitor'],
    ['2.13', 'Effect of Dielectric on Capacitance'],
    ['2.14', 'Combination of Capacitors'],
    ['2.15', 'Energy Stored in a Capacitor']
  ]],
  [3, 'Current Electricity', 3, [
    ['3.1', 'Introduction'],
    ['3.2', 'Electric Current'],
    ['3.3', 'Electric Currents in Conductors'],
    ['3.4', "Ohm's law"],
    ['3.5', 'Drift of Electrons and the Origin of Resistivity'],
    ['3.6', "Limitations of Ohm's Law"],
    ['3.7', 'Resistivity of Various Materials'],
    ['3.8', 'Temperature Dependence of Resistivity'],
    ['3.9', 'Electrical Energy, Power'],
    ['3.10', 'Cells, emf, Internal Resistance'],
    ['3.11', 'Cells in Series and in Parallel'],
    ['3.12', "Kirchhoff's Rules"],
    ['3.13', 'Wheatstone Bridge']
  ]],
  [4, 'Moving Charges and Magnetism', 2, [
    ['4.1', 'Introduction'],
    ['4.2', 'Magnetic Force'],
    ['4.3', 'Motion in a Magnetic Field'],
    ['4.4', 'Magnetic Field due to a Current Element, Biot-Savart Law'],
    ['4.5', 'Magnetic Field on the Axis of a Circular Current Loop'],
    ['4.6', "Ampere's Circuital Law"],
    ['4.7', 'The Solenoid'],
    ['4.8', 'Force between Two Parallel Currents, the Ampere'],
    ['4.9', 'Torque on Current Loop, Magnetic Dipole'],
    ['4.10', 'The Moving Coil Galvanometer']
  ]],
  [5, 'Magnetism and Matter', 1, [
    ['5.1', 'Introduction'],
    ['5.2', 'The Bar Magnet'],
    ['5.3', "Magnetism and Gauss's Law"],
    ['5.4', 'Magnetisation and Magnetic Intensity'],
    ['5.5', 'Magnetic Properties of Materials']
  ]],
  [6, 'Electromagnetic Induction', 1, [
    ['6.1', 'Introduction'],
    ['6.2', 'The Experiments of Faraday and Henry'],
    ['6.3', 'Magnetic Flux'],
    ['6.4', "Faraday's Law of Induction"],
    ['6.5', "Lenz's Law and Conservation of Energy"],
    ['6.6', 'Motional Electromotive Force'],
    ['6.7', 'Inductance'],
    ['6.8', 'AC Generator']
  ]],
  [7, 'Alternating Current', 2, [
    ['7.1', 'Introduction'],
    ['7.2', 'AC Voltage Applied to a Resistor'],
    ['7.3', 'Representation of AC Current and Voltage by Rotating Vectors — Phasors'],
    ['7.4', 'AC Voltage Applied to an Inductor'],
    ['7.5', 'AC Voltage Applied to a Capacitor'],
    ['7.6', 'AC Voltage Applied to a Series LCR Circuit'],
    ['7.7', 'Power in AC Circuit: The Power Factor'],
    ['7.8', 'Transformers']
  ]],
  [8, 'Electromagnetic Waves', 1, [
    ['8.1', 'Introduction'],
    ['8.2', 'Displacement Current'],
    ['8.3', 'Electromagnetic Waves'],
    ['8.4', 'Electromagnetic Spectrum']
  ]],
  [9, 'Ray Optics and Optical Instruments', 2, [
    ['9.1', 'Introduction'],
    ['9.2', 'Reflection of Light by Spherical Mirrors'],
    ['9.3', 'Refraction'],
    ['9.4', 'Total Internal Reflection'],
    ['9.5', 'Refraction at Spherical Surfaces and by Lenses'],
    ['9.6', 'Refraction through a Prism'],
    ['9.7', 'Optical Instruments']
  ]],
  [10, 'Wave Optics', 2, [
    ['10.1', 'Introduction'],
    ['10.2', 'Huygens Principle'],
    ['10.3', 'Refraction and Reflection of Plane Waves using Huygens Principle'],
    ['10.4', 'Coherent and Incoherent Addition of Waves'],
    ['10.5', "Interference of Light Waves and Young's Experiment"],
    ['10.6', 'Diffraction'],
    ['10.7', 'Polarisation']
  ]],
  [11, 'Dual Nature of Radiation and Matter', 1, [
    ['11.1', 'Introduction'],
    ['11.2', 'Electron Emission'],
    ['11.3', 'Photoelectric Effect'],
    ['11.4', 'Experimental Study of Photoelectric Effect'],
    ['11.5', 'Photoelectric Effect and Wave Theory of Light'],
    ['11.6', "Einstein's Photoelectric Equation: Energy Quantum of Radiation"],
    ['11.7', 'Particle Nature of Light: The Photon'],
    ['11.8', 'Wave Nature of Matter']
  ]],
  [12, 'Atoms', 1, [
    ['12.1', 'Introduction'],
    ['12.2', "Alpha-particle Scattering and Rutherford's Nuclear Model of Atom"],
    ['12.3', 'Atomic Spectra'],
    ['12.4', 'Bohr Model of the Hydrogen Atom'],
    ['12.5', 'The Line Spectra of the Hydrogen Atom'],
    ['12.6', "DE Broglie's Explanation of Bohr's Second Postulate of Quantisation"]
  ]],
  [13, 'Nuclei', 1, [
    ['13.1', 'Introduction'],
    ['13.2', 'Atomic Masses and Composition of Nucleus'],
    ['13.3', 'Size of the Nucleus'],
    ['13.4', 'Mass-Energy and Nuclear Binding Energy'],
    ['13.5', 'Nuclear Force'],
    ['13.6', 'Radioactivity'],
    ['13.7', 'Nuclear Energy']
  ]],
  [14, 'Semiconductor Electronics: Materials, Devices and Simple Circuits', 1, [
    ['14.1', 'Introduction'],
    ['14.2', 'Classification of Metals, Conductors and Semiconductors'],
    ['14.3', 'Intrinsic Semiconductor'],
    ['14.4', 'Extrinsic Semiconductor'],
    ['14.5', 'p-n Junction'],
    ['14.6', 'Semiconductor Diode'],
    ['14.7', 'Application of Junction Diode as a Rectifier']
  ]]
]

// 10 chapters — no p-Block Elements chapter in this book (see header note).
const CHEMISTRY = [
  [1, 'Solutions', 1, [
    ['1.1', 'Types of Solutions'],
    ['1.2', 'Expressing Concentration of Solutions'],
    ['1.3', 'Solubility'],
    ['1.4', 'Vapour Pressure of Liquid Solutions'],
    ['1.5', 'Ideal and Non-ideal Solutions'],
    ['1.6', 'Colligative Properties and Determination of Molar Mass'],
    ['1.7', 'Abnormal Molar Masses']
  ]],
  [2, 'Electrochemistry', 1, [
    ['2.1', 'Electrochemical Cells'],
    ['2.2', 'Galvanic Cells'],
    ['2.3', 'Nernst Equation'],
    ['2.4', 'Conductance of Electrolytic Solutions'],
    ['2.5', 'Electrolytic Cells and Electrolysis'],
    ['2.6', 'Batteries'],
    ['2.7', 'Fuel Cells'],
    ['2.8', 'Corrosion']
  ]],
  [3, 'Chemical Kinetics', 1, [
    ['3.1', 'Rate of a Chemical Reaction'],
    ['3.2', 'Factors Influencing Rate of a Reaction'],
    ['3.3', 'Integrated Rate Equations'],
    ['3.4', 'Temperature Dependence of the Rate of a Reaction'],
    ['3.5', 'Collision Theory of Chemical Reactions']
  ]],
  [4, 'The d- and f-Block Elements', 2, [
    ['4.1', 'Position in the Periodic Table'],
    ['4.2', 'Electronic Configurations of the d-Block Elements'],
    ['4.3', 'General Properties of the Transition Elements (d-Block)'],
    ['4.4', 'Some Important Compounds of Transition Elements'],
    ['4.5', 'The Lanthanoids'],
    ['4.6', 'The Actinoids'],
    ['4.7', 'Some Applications of d- and f-Block Elements']
  ]],
  [5, 'Coordination Compounds', 2, [
    ['5.1', "Werner's Theory of Coordination Compounds"],
    ['5.2', 'Definitions of Some Important Terms Pertaining to Coordination Compounds'],
    ['5.3', 'Nomenclature of Coordination Compounds'],
    ['5.4', 'Isomerism in Coordination Compounds'],
    ['5.5', 'Bonding in Coordination Compounds'],
    ['5.6', 'Bonding in Metal Carbonyls'],
    ['5.7', 'Importance and Applications of Coordination Compounds']
  ]],
  [6, 'Haloalkanes and Haloarenes', 1, [
    ['6.1', 'Classification'],
    ['6.2', 'Nomenclature'],
    ['6.3', 'Nature of C-X Bond'],
    ['6.4', 'Methods of Preparation of Haloalkanes'],
    ['6.5', 'Preparation of Haloarenes'],
    ['6.6', 'Physical Properties'],
    ['6.7', 'Chemical Reactions'],
    ['6.8', 'Polyhalogen Compounds']
  ]],
  [7, 'Alcohols, Phenols and Ethers', 1, [
    ['7.1', 'Classification'],
    ['7.2', 'Nomenclature'],
    ['7.3', 'Structures of Functional Groups'],
    ['7.4', 'Alcohols and Phenols'],
    ['7.5', 'Some Commercially Important Alcohols'],
    ['7.6', 'Ethers']
  ]],
  [8, 'Aldehydes, Ketones and Carboxylic Acids', 2, [
    ['8.1', 'Nomenclature and Structure of Carbonyl Group'],
    ['8.2', 'Preparation of Aldehydes and Ketones'],
    ['8.3', 'Physical Properties'],
    ['8.4', 'Chemical Reactions'],
    ['8.5', 'Uses of Aldehydes and Ketones'],
    ['8.6', 'Nomenclature and Structure of Carboxyl Group'],
    ['8.7', 'Methods of Preparation of Carboxylic Acids'],
    ['8.8', 'Physical Properties'],
    ['8.9', 'Chemical Reactions'],
    ['8.10', 'Uses of Carboxylic Acids']
  ]],
  [9, 'Amines', 1, [
    ['9.1', 'Structure of Amines'],
    ['9.2', 'Classification'],
    ['9.3', 'Nomenclature'],
    ['9.4', 'Preparation of Amines'],
    ['9.5', 'Physical Properties'],
    ['9.6', 'Chemical Reactions'],
    ['9.7', 'Method of Preparation of Diazonium Salts'],
    ['9.8', 'Physical Properties'],
    ['9.9', 'Chemical Reactions'],
    ['9.10', 'Importance of Diazonium Salts in Synthesis of Aromatic Compounds']
  ]],
  [10, 'Biomolecules', 1, [
    ['10.1', 'Carbohydrates'],
    ['10.2', 'Proteins'],
    ['10.3', 'Enzymes'],
    ['10.4', 'Vitamins'],
    ['10.5', 'Nucleic Acids'],
    ['10.6', 'Hormones']
  ]]
]

const MATHS = [
  [1, 'Relations and Functions', 1, [
    ['1.1', 'Introduction'],
    ['1.2', 'Types of Relations'],
    ['1.3', 'Types of Functions'],
    ['1.4', 'Composition of Functions and Invertible Function']
  ]],
  [2, 'Inverse Trigonometric Functions', 1, [
    ['2.1', 'Introduction'],
    ['2.2', 'Basic Concepts'],
    ['2.3', 'Properties of Inverse Trigonometric Functions']
  ]],
  [3, 'Matrices', 1, [
    ['3.1', 'Introduction'],
    ['3.2', 'Matrix'],
    ['3.3', 'Types of Matrices'],
    ['3.4', 'Operations on Matrices'],
    ['3.5', 'Transpose of a Matrix'],
    ['3.6', 'Symmetric and Skew Symmetric Matrices'],
    ['3.7', 'Invertible Matrices']
  ]],
  [4, 'Determinants', 1, [
    ['4.1', 'Introduction'],
    ['4.2', 'Determinant'],
    ['4.3', 'Area of a Triangle'],
    ['4.4', 'Minors and Cofactors'],
    ['4.5', 'Adjoint and Inverse of a Matrix'],
    ['4.6', 'Applications of Determinants and Matrices']
  ]],
  [5, 'Continuity and Differentiability', 2, [
    ['5.1', 'Introduction'],
    ['5.2', 'Continuity'],
    ['5.3', 'Differentiability'],
    ['5.4', 'Exponential and Logarithmic Functions'],
    ['5.5', 'Logarithmic Differentiation'],
    ['5.6', 'Derivatives of Functions in Parametric Forms'],
    ['5.7', 'Second Order Derivative']
  ]],
  [6, 'Application of Derivatives', 2, [
    ['6.1', 'Introduction'],
    ['6.2', 'Rate of Change of Quantities'],
    ['6.3', 'Increasing and Decreasing Functions'],
    ['6.4', 'Maxima and Minima']
  ]],
  [7, 'Integrals', 2, [
    ['7.1', 'Introduction'],
    ['7.2', 'Integration as an Inverse Process of Differentiation'],
    ['7.3', 'Methods of Integration'],
    ['7.4', 'Integrals of Some Particular Functions'],
    ['7.5', 'Integration by Partial Fractions'],
    ['7.6', 'Integration by Parts'],
    ['7.7', 'Definite Integral'],
    ['7.8', 'Fundamental Theorem of Calculus'],
    ['7.9', 'Evaluation of Definite Integrals by Substitution'],
    ['7.10', 'Some Properties of Definite Integrals']
  ]],
  [8, 'Application of Integrals', 1, [
    ['8.1', 'Introduction'],
    ['8.2', 'Area under Simple Curves']
  ]],
  [9, 'Differential Equations', 1, [
    ['9.1', 'Introduction'],
    ['9.2', 'Basic Concepts'],
    ['9.3', 'General and Particular Solutions of a Differential Equation'],
    ['9.4', 'Methods of Solving First Order, First Degree Differential Equations']
  ]],
  [10, 'Vector Algebra', 2, [
    ['10.1', 'Introduction'],
    ['10.2', 'Some Basic Concepts'],
    ['10.3', 'Types of Vectors'],
    ['10.4', 'Addition of Vectors'],
    ['10.5', 'Multiplication of a Vector by a Scalar'],
    ['10.6', 'Product of Two Vectors']
  ]],
  [11, 'Three Dimensional Geometry', 2, [
    ['11.1', 'Introduction'],
    ['11.2', 'Direction Cosines and Direction Ratios of a Line'],
    ['11.3', 'Equation of a Line in Space'],
    ['11.4', 'Angle between Two Lines'],
    ['11.5', 'Shortest Distance between Two Lines']
  ]],
  [12, 'Linear Programming', 1, [
    ['12.1', 'Introduction'],
    ['12.2', 'Linear Programming Problem and its Mathematical Formulation']
  ]],
  [13, 'Probability', 2, [
    ['13.1', 'Introduction'],
    ['13.2', 'Conditional Probability'],
    ['13.3', 'Multiplication Theorem on Probability'],
    ['13.4', 'Independent Events'],
    ['13.5', "Bayes' Theorem"]
  ]]
]

// Book gives chapter names only ("topics": [] in the source) — each becomes a
// single plannable block via expandChapters()'s fallback. jeeQ null: NEET
// subject, not JEE.
const BIOLOGY = [
  [1, 'Sexual Reproduction in Flowering Plants', null, []],
  [2, 'Human Reproduction', null, []],
  [3, 'Reproductive Health', null, []],
  [4, 'Principles of Inheritance and Variation', null, []],
  [5, 'Molecular Basis of Inheritance', null, []],
  [6, 'Evolution', null, []],
  [7, 'Human Health and Disease', null, []],
  [8, 'Microbes in Human Welfare', null, []],
  [9, 'Biotechnology : Principles and Processes', null, []],
  [10, 'Biotechnology and its Applications', null, []],
  [11, 'Organisms and Populations', null, []],
  [12, 'Ecosystem', null, []],
  [13, 'Biodiversity and Conservation', null, []]
]

// Gujarat state elective — no CBSE equivalent, no competitive-exam lens.
// Book gives chapter names only, same fallback as Biology above.
const COMPUTER_STUDIES = [
  [1, 'Creating HTML forms using KompoZer', null, []],
  [2, 'Cascading Style Sheets and Java script', null, []],
  [3, 'Designing simple website using KompoZer', null, []],
  [4, 'Introduction to E-Commerce', null, []],
  [5, 'Introduction to M-Commerce', null, []],
  [6, 'Object-Oriented concepts', null, []],
  [7, 'Java Basics', null, []],
  [8, 'Classes and objects in Java', null, []],
  [9, 'Working with Array and String', null, []],
  [10, 'Exception handling in Java', null, []],
  [11, 'File handling', null, []],
  [12, 'Publishing documents using LaTeX', null, []],
  [13, 'Other useful free tools and services', null, []]
]

export const CLASS_12 = {
  Physics: expand('p', PHYSICS),
  Chemistry: expand('c', CHEMISTRY),
  Maths: expand('m', MATHS),
  Biology: expand('b12_', BIOLOGY),
  'Computer Studies': expand('cs12_', COMPUTER_STUDIES)
}
