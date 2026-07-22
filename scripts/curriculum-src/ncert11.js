// Class 11 chapter + topic tree, transcribed from the Gujarat Board (GSEB)
// Class 11 textbooks the student supplied.
//
// PROVENANCE / SHARING: those books are the NCERT titles (the English reader is
// NCERT's "Hornbill", and the PCM/Biology chapter lists match the rationalized
// NCERT), so this same tree serves BOTH GSEB and CBSE Class 11 — the boards
// differ only in exam marks, which live in the BOARD_MARKS overlay in
// syllabus.js. If the two boards ever diverge on chapters, split this per board;
// chaptersFor(board, …) is already the seam.
//
// Rows are compact to keep ~400 topics readable and transcription-safe:
//   [chapterNumber, 'Chapter name', jeeQ, [[topicCode, 'Topic title'], …]]
//
// `jeeQ` — avg JEE Main questions/session (national, so board-independent).
//   null for Biology and English: neither is examined by JEE. Their chapters
//   fall back to the engine's floor weight, so they're planned evenly until a
//   NEET lens (Biology) / board marks (English) land.
//
// Topics carry no difficulty `type`, so the engine applies its Concept-level
// default. Adding types later is a pure refinement — nothing else changes.

import { expandChapters as expand } from './textbookRows'

const PHYSICS = [
  [1, 'Units and Measurements', 1, [
    ['1.1', 'Introduction'],
    ['1.2', 'The International System of Units'],
    ['1.3', 'Significant Figures'],
    ['1.4', 'Dimensions of Physical Quantities'],
    ['1.5', 'Dimensional Formulae and Dimensional Equations'],
    ['1.6', 'Dimensional Analysis and its Applications']
  ]],
  [2, 'Motion in a Straight Line', 1, [
    ['2.1', 'Introduction'],
    ['2.2', 'Instantaneous Velocity and Speed'],
    ['2.3', 'Acceleration'],
    ['2.4', 'Kinematic Equations for Uniformly Accelerated Motion']
  ]],
  [3, 'Motion in a Plane', 1, [
    ['3.1', 'Introduction'],
    ['3.2', 'Scalars and Vectors'],
    ['3.3', 'Multiplication of Vectors by Real Numbers'],
    ['3.4', 'Addition and Subtraction of Vectors - Graphical Method'],
    ['3.5', 'Resolution of Vectors'],
    ['3.6', 'Vector Addition - Analytical Method'],
    ['3.7', 'Motion in a Plane'],
    ['3.8', 'Motion in a Plane with Constant Acceleration'],
    ['3.9', 'Projectile Motion'],
    ['3.10', 'Uniform Circular Motion']
  ]],
  [4, 'Laws of Motion', 2, [
    ['4.1', 'Introduction'],
    ['4.2', "Aristotle's Fallacy"],
    ['4.3', 'The Law of Inertia'],
    ['4.4', "Newton's First Law of Motion"],
    ['4.5', "Newton's Second Law of Motion"],
    ['4.6', "Newton's Third Law of Motion"],
    ['4.7', 'Conservation of Momentum'],
    ['4.8', 'Equilibrium of a Particle'],
    ['4.9', 'Common Forces in Mechanics'],
    ['4.10', 'Circular Motion'],
    ['4.11', 'Solving Problems in Mechanics']
  ]],
  [5, 'Work, Energy and Power', 1, [
    ['5.1', 'Introduction'],
    ['5.2', 'Notions of Work and Kinetic Energy: The Work-Energy Theorem'],
    ['5.3', 'Work'],
    ['5.4', 'Kinetic Energy'],
    ['5.5', 'Work Done by a Variable Force'],
    ['5.6', 'The Work-Energy Theorem for a Variable Force'],
    ['5.7', 'The Concept of Potential Energy'],
    ['5.8', 'The Conservation of Mechanical Energy'],
    ['5.9', 'The Potential Energy of a Spring'],
    ['5.10', 'Power'],
    ['5.11', 'Collisions']
  ]],
  [6, 'System of Particles and Rotational Motion', 2, [
    ['6.1', 'Introduction'],
    ['6.2', 'Centre of Mass'],
    ['6.3', 'Motion of Centre of Mass'],
    ['6.4', 'Linear Momentum of a System of Particles'],
    ['6.5', 'Vector Product of Two Vectors'],
    ['6.6', 'Angular Velocity and its Relation with Linear Velocity'],
    ['6.7', 'Torque and Angular Momentum'],
    ['6.8', 'Equilibrium of a Rigid Body'],
    ['6.9', 'Moment of Inertia'],
    ['6.10', 'Kinematics of Rotational Motion about a Fixed Axis'],
    ['6.11', 'Dynamics of Rotational Motion about a Fixed Axis'],
    ['6.12', 'Angular Momentum in case of Rotations about a Fixed Axis']
  ]],
  [7, 'Gravitation', 1, [
    ['7.1', 'Introduction'],
    ['7.2', "Kepler's Laws"],
    ['7.3', 'Universal Law of Gravitation'],
    ['7.4', 'The Gravitational Constant'],
    ['7.5', 'Acceleration Due to Gravity of the Earth'],
    ['7.6', 'Acceleration Due to Gravity Below and Above the Surface of Earth'],
    ['7.7', 'Gravitational Potential Energy'],
    ['7.8', 'Escape Speed'],
    ['7.9', 'Earth Satellites'],
    ['7.10', 'Energy of an Orbiting Satellite']
  ]],
  [8, 'Mechanical Properties of Solids', 1, [
    ['8.1', 'Introduction'],
    ['8.2', 'Stress and Strain'],
    ['8.3', "Hooke's Law"],
    ['8.4', 'Stress-strain Curve'],
    ['8.5', 'Elastic Moduli'],
    ['8.6', 'Applications of Elastic Behaviour of Materials']
  ]],
  [9, 'Mechanical Properties of Fluids', 1, [
    ['9.1', 'Introduction'],
    ['9.2', 'Pressure'],
    ['9.3', 'Streamline Flow'],
    ['9.4', "Bernoulli's Principle"],
    ['9.5', 'Viscosity'],
    ['9.6', 'Surface Tension']
  ]],
  [10, 'Thermal Properties of Matter', 1, [
    ['10.1', 'Introduction'],
    ['10.2', 'Temperature and Heat'],
    ['10.3', 'Measurement of Temperature'],
    ['10.4', 'Ideal-gas Equation and Absolute Temperature'],
    ['10.5', 'Thermal Expansion'],
    ['10.6', 'Specific Heat Capacity'],
    ['10.7', 'Calorimetry'],
    ['10.8', 'Change of State'],
    ['10.9', 'Heat Transfer'],
    ['10.10', "Newton's Law of Cooling"]
  ]],
  [11, 'Thermodynamics', 1, [
    ['11.1', 'Introduction'],
    ['11.2', 'Thermal Equilibrium'],
    ['11.3', 'Zeroth Law of Thermodynamics'],
    ['11.4', 'Heat, Internal Energy and Work'],
    ['11.5', 'First Law of Thermodynamics'],
    ['11.6', 'Specific Heat Capacity'],
    ['11.7', 'Thermodynamic State Variables and Equation of State'],
    ['11.8', 'Thermodynamic Processes'],
    ['11.9', 'Second Law of Thermodynamics'],
    ['11.10', 'Reversible and Irreversible Processes'],
    ['11.11', 'Carnot Engine']
  ]],
  [12, 'Kinetic Theory', 1, [
    ['12.1', 'Introduction'],
    ['12.2', 'Molecular Nature of Matter'],
    ['12.3', 'Behaviour of Gases'],
    ['12.4', 'Kinetic Theory of an Ideal Gas'],
    ['12.5', 'Law of Equipartition of Energy'],
    ['12.6', 'Specific Heat Capacity'],
    ['12.7', 'Mean Free Path']
  ]],
  [13, 'Oscillations', 1, [
    ['13.1', 'Introduction'],
    ['13.2', 'Periodic and Oscillatory Motions'],
    ['13.3', 'Simple Harmonic Motion'],
    ['13.4', 'Simple Harmonic Motion and Uniform Circular Motion'],
    ['13.5', 'Velocity and Acceleration in Simple Harmonic Motion'],
    ['13.6', 'Force Law for Simple Harmonic Motion'],
    ['13.7', 'Energy in Simple Harmonic Motion'],
    ['13.8', 'The Simple Pendulum']
  ]],
  [14, 'Waves', 1, [
    ['14.1', 'Introduction'],
    ['14.2', 'Transverse and Longitudinal Waves'],
    ['14.3', 'Displacement Relation in a Progressive Wave'],
    ['14.4', 'The Speed of a Travelling Wave'],
    ['14.5', 'The Principle of Superposition of Waves'],
    ['14.6', 'Reflection of Waves'],
    ['14.7', 'Beats']
  ]]
]

const CHEMISTRY = [
  [1, 'Some Basic Concepts of Chemistry', 2, [
    ['1.1', 'Importance of Chemistry'],
    ['1.2', 'Nature of Matter'],
    ['1.3', 'Properties of Matter and their Measurement'],
    ['1.4', 'Uncertainty in Measurement'],
    ['1.5', 'Laws of Chemical Combinations'],
    ['1.6', "Dalton's Atomic Theory"],
    ['1.7', 'Atomic and Molecular Masses'],
    ['1.8', 'Mole Concept and Molar Masses'],
    ['1.9', 'Percentage Composition'],
    ['1.10', 'Stoichiometry and Stoichiometric Calculations']
  ]],
  [2, 'Structure of Atom', 1, [
    ['2.1', 'Discovery of Sub-atomic Particles'],
    ['2.2', 'Atomic Models'],
    ['2.3', "Developments Leading to the Bohr's Model of Atom"],
    ['2.4', "Bohr's Model for Hydrogen Atom"],
    ['2.5', 'Towards Quantum Mechanical Model of the Atom']
  ]],
  [3, 'Classification of Elements and Periodicity in Properties', 1, [
    ['3.1', 'Why do we Need to Classify Elements ?'],
    ['3.2', 'Genesis of Periodic Classification'],
    ['3.3', 'Modern Periodic Law and the Present Form of the Periodic Table'],
    ['3.4', 'Nomenclature of Elements with Atomic Numbers > 100'],
    ['3.5', 'Electronic Configurations of Elements and the Periodic Table'],
    ['3.6', 'Electronic Configurations and Types of Elements: s-, p-, d-, f- Blocks'],
    ['3.7', 'Periodic Trends in Properties of Elements']
  ]],
  [4, 'Chemical Bonding and Molecular Structure', 2, [
    ['4.1', 'Kössel-Lewis Approach to Chemical Bonding'],
    ['4.2', 'Ionic or Electrovalent Bond'],
    ['4.3', 'Bond Parameters'],
    ['4.4', 'The Valence Shell Electron Pair Repulsion (VSEPR) Theory'],
    ['4.5', 'Valence Bond Theory'],
    ['4.6', 'Hybridisation'],
    ['4.7', 'Molecular Orbital Theory'],
    ['4.8', 'Bonding in Some Homonuclear Diatomic Molecules'],
    ['4.9', 'Hydrogen Bonding']
  ]],
  [5, 'Thermodynamics', 1, [
    ['5.1', 'Thermodynamic Terms'],
    ['5.2', 'Applications'],
    ['5.3', 'Measurement of ΔU and ΔH: Calorimetry'],
    ['5.4', 'Enthalpy Change, ΔrH of a Reaction - Reaction Enthalpy'],
    ['5.5', 'Enthalpies for Different Types of Reactions'],
    ['5.6', 'Spontaneity'],
    ['5.7', 'Gibbs Energy Change and Equilibrium']
  ]],
  [6, 'Equilibrium', 2, [
    ['6.1', 'Equilibrium in Physical Processes'],
    ['6.2', 'Equilibrium in Chemical Processes - Dynamic Equilibrium'],
    ['6.3', 'Law of Chemical Equilibrium and Equilibrium Constant'],
    ['6.4', 'Homogeneous Equilibria'],
    ['6.5', 'Heterogeneous Equilibria'],
    ['6.6', 'Applications of Equilibrium Constants'],
    ['6.7', 'Relationship between Equilibrium Constant K, Reaction Quotient Q and Gibbs Energy G'],
    ['6.8', 'Factors Affecting Equilibria'],
    ['6.9', 'Ionic Equilibrium in Solution'],
    ['6.10', 'Acids, Bases and Salts'],
    ['6.11', 'Ionization of Acids and Bases'],
    ['6.12', 'Buffer Solutions'],
    ['6.13', 'Solubility Equilibria of Sparingly Soluble Salts']
  ]],
  [7, 'Redox Reactions', 1, [
    ['7.1', 'Classical Idea of Redox Reactions-Oxidation and Reduction Reactions'],
    ['7.2', 'Redox Reactions in Terms of Electron Transfer Reactions'],
    ['7.3', 'Oxidation Number'],
    ['7.4', 'Redox Reactions and Electrode Processes']
  ]],
  [8, 'Organic Chemistry - Some Basic Principles and Techniques', 2, [
    ['8.1', 'General Introduction'],
    ['8.2', 'Tetravalence of Carbon: Shapes of Organic Compounds'],
    ['8.3', 'Structural Representations of Organic Compounds'],
    ['8.4', 'Classification of Organic Compounds'],
    ['8.5', 'Nomenclature of Organic Compounds'],
    ['8.6', 'Isomerism'],
    ['8.7', 'Fundamental Concepts in Organic Reaction Mechanism'],
    ['8.8', 'Methods of Purification of Organic Compounds'],
    ['8.9', 'Qualitative Analysis of Organic Compounds'],
    ['8.10', 'Quantitative Analysis']
  ]],
  [9, 'Hydrocarbons', 1, [
    ['9.1', 'Classification'],
    ['9.2', 'Alkanes'],
    ['9.3', 'Alkenes'],
    ['9.4', 'Alkynes'],
    ['9.5', 'Aromatic Hydrocarbon'],
    ['9.6', 'Carcinogenicity and Toxicity']
  ]]
]

const MATHS = [
  [1, 'Sets', 1, [
    ['1.1', 'Introduction'],
    ['1.2', 'Sets and their Representations'],
    ['1.3', 'The Empty Set'],
    ['1.4', 'Finite and Infinite Sets'],
    ['1.5', 'Equal Sets'],
    ['1.6', 'Subsets'],
    ['1.7', 'Universal Set'],
    ['1.8', 'Venn Diagrams'],
    ['1.9', 'Operations on Sets'],
    ['1.10', 'Complement of a Set']
  ]],
  [2, 'Relations and Functions', 1, [
    ['2.1', 'Introduction'],
    ['2.2', 'Cartesian Product of Sets'],
    ['2.3', 'Relations'],
    ['2.4', 'Functions']
  ]],
  [3, 'Trigonometric Functions', 2, [
    ['3.1', 'Introduction'],
    ['3.2', 'Angles'],
    ['3.3', 'Trigonometric Functions'],
    ['3.4', 'Trigonometric Functions of Sum and Difference of Two Angles']
  ]],
  [4, 'Complex Numbers and Quadratic Equations', 2, [
    ['4.1', 'Introduction'],
    ['4.2', 'Complex Numbers'],
    ['4.3', 'Algebra of Complex Numbers'],
    ['4.4', 'The Modulus and the Conjugate of a Complex Number'],
    ['4.5', 'Argand Plane']
  ]],
  [5, 'Linear Inequalities', 1, [
    ['5.1', 'Introduction'],
    ['5.2', 'Inequalities'],
    ['5.3', 'Algebraic Solutions of Linear Inequalities in One Variable and their Graphical Representation']
  ]],
  [6, 'Permutations and Combinations', 1, [
    ['6.1', 'Introduction'],
    ['6.2', 'Fundamental Principle of Counting'],
    ['6.3', 'Permutations'],
    ['6.4', 'Combinations']
  ]],
  [7, 'Binomial Theorem', 1, [
    ['7.1', 'Introduction'],
    ['7.2', 'Binomial Theorem for Positive Integral Indices']
  ]],
  [8, 'Sequences and Series', 2, [
    ['8.1', 'Introduction'],
    ['8.2', 'Sequences'],
    ['8.3', 'Series'],
    ['8.4', 'Geometric Progression (G.P.)'],
    ['8.5', 'Relationship Between A.M. and G.M.']
  ]],
  [9, 'Straight Lines', 1, [
    ['9.1', 'Introduction'],
    ['9.2', 'Slope of a Line'],
    ['9.3', 'Various Forms of the Equation of a Line'],
    ['9.4', 'Distance of a Point From a Line']
  ]],
  [10, 'Conic Sections', 2, [
    ['10.1', 'Introduction'],
    ['10.2', 'Sections of a Cone'],
    ['10.3', 'Circle'],
    ['10.4', 'Parabola'],
    ['10.5', 'Ellipse'],
    ['10.6', 'Hyperbola']
  ]],
  [11, 'Introduction to Three Dimensional Geometry', 1, [
    ['11.1', 'Introduction'],
    ['11.2', 'Coordinate Axes and Coordinate Planes in Three Dimensional Space'],
    ['11.3', 'Coordinates of a Point in Space'],
    ['11.4', 'Distance between Two Points']
  ]],
  [12, 'Limits and Derivatives', 1, [
    ['12.1', 'Introduction'],
    ['12.2', 'Intuitive Idea of Derivatives'],
    ['12.3', 'Limits'],
    ['12.4', 'Limits of Trigonometric Functions'],
    ['12.5', 'Limits Involving Exponential and Logarithmic Functions'],
    ['12.6', 'Derivatives']
  ]],
  [13, 'Statistics', 1, [
    ['13.1', 'Introduction'],
    ['13.2', 'Measures of Dispersion'],
    ['13.3', 'Range'],
    ['13.4', 'Mean Deviation'],
    ['13.5', 'Variance and Standard Deviation']
  ]],
  [14, 'Probability', 1, [
    ['14.1', 'Event'],
    ['14.2', 'Axiomatic Approach to Probability']
  ]]
]

// Biology and English carry no jeeQ — neither is examined by JEE.
const BIOLOGY = [
  [1, 'The Living World', null, [
    ['1.1', 'Diversity in the Living World'],
    ['1.2', 'Taxonomic Categories']
  ]],
  [2, 'Biological Classification', null, [
    ['2.1', 'Kingdom Monera'],
    ['2.2', 'Kingdom Protista'],
    ['2.3', 'Kingdom Fungi'],
    ['2.4', 'Kingdom Plantae'],
    ['2.5', 'Kingdom Animalia'],
    ['2.6', 'Viruses, Viroids, Prions and Lichens']
  ]],
  [3, 'Plant Kingdom', null, [
    ['3.1', 'Algae'],
    ['3.2', 'Bryophytes'],
    ['3.3', 'Pteridophytes'],
    ['3.4', 'Gymnosperms'],
    ['3.5', 'Angiosperms']
  ]],
  [4, 'Animal Kingdom', null, [
    ['4.1', 'Basis of Classification'],
    ['4.2', 'Classification of Animals']
  ]],
  [5, 'Morphology of Flowering Plants', null, [
    ['5.1', 'The Root'],
    ['5.2', 'The Stem'],
    ['5.3', 'The Leaf'],
    ['5.4', 'The Inflorescence'],
    ['5.5', 'The Flower'],
    ['5.6', 'The Fruit'],
    ['5.7', 'The Seed'],
    ['5.8', 'Semi-technical Description of a Typical Flowering Plant'],
    ['5.9', 'Description of Some Important Families']
  ]],
  [6, 'Anatomy of Flowering Plants', null, [
    ['6.1', 'The Tissue System'],
    ['6.2', 'Anatomy of Dicotyledonous and Monocotyledonous Plants']
  ]],
  [7, 'Structural Organisation in Animals', null, [
    ['7.1', 'Organ and Organ System'],
    ['7.2', 'Frogs']
  ]],
  [8, 'Cell: The Unit of Life', null, [
    ['8.1', 'What is a Cell?'],
    ['8.2', 'Cell Theory'],
    ['8.3', 'An Overview of Cell'],
    ['8.4', 'Prokaryotic Cells'],
    ['8.5', 'Eukaryotic Cells']
  ]],
  [9, 'Biomolecules', null, [
    ['9.1', 'How to Analyse Chemical Composition?'],
    ['9.2', 'Primary and Secondary Metabolites'],
    ['9.3', 'Biomacromolecules'],
    ['9.4', 'Proteins'],
    ['9.5', 'Polysaccharides'],
    ['9.6', 'Nucleic Acids'],
    ['9.7', 'Structure of Proteins'],
    ['9.8', 'Enzymes']
  ]],
  [10, 'Cell Cycle and Cell Division', null, [
    ['10.1', 'Cell Cycle'],
    ['10.2', 'M Phase'],
    ['10.3', 'Significance of Mitosis'],
    ['10.4', 'Meiosis'],
    ['10.5', 'Significance of Meiosis']
  ]],
  [11, 'Photosynthesis in Higher Plants', null, [
    ['11.1', 'What do we Know?'],
    ['11.2', 'Early Experiments'],
    ['11.3', 'Where does Photosynthesis take place?'],
    ['11.4', 'How many Pigments are involved in Photosynthesis?'],
    ['11.5', 'Light Reaction'],
    ['11.6', 'The Electron Transport Chain'],
    ['11.7', 'Where are the ATP and NADPH Used?'],
    ['11.8', 'The C4 Pathway'],
    ['11.9', 'Photorespiration'],
    ['11.10', 'Factors affecting Photosynthesis']
  ]],
  [12, 'Respiration in Plants', null, [
    ['12.1', 'Do Plants Breathe?'],
    ['12.2', 'Glycolysis'],
    ['12.3', 'Fermentation'],
    ['12.4', 'Aerobic Respiration'],
    ['12.5', 'The Respiratory Balance Sheet'],
    ['12.6', 'Amphibolic Pathway'],
    ['12.7', 'Respiratory Quotient']
  ]],
  [13, 'Plant Growth and Development', null, [
    ['13.1', 'Growth'],
    ['13.2', 'Differentiation, Dedifferentiation and Redifferentiation'],
    ['13.3', 'Development'],
    ['13.4', 'Plant Growth Regulators'],
    ['13.5', 'Photoperiodism'],
    ['13.6', 'Vernalisation']
  ]],
  [14, 'Breathing and Exchange of Gases', null, [
    ['14.1', 'Respiratory Organs'],
    ['14.2', 'Mechanism of Breathing'],
    ['14.3', 'Exchange of Gases'],
    ['14.4', 'Transport of Gases'],
    ['14.5', 'Regulation of Respiration'],
    ['14.6', 'Disorders of Respiratory System']
  ]],
  [15, 'Body Fluids and Circulation', null, [
    ['15.1', 'Blood'],
    ['15.2', 'Lymph (Tissue Fluid)'],
    ['15.3', 'Circulatory Pathways'],
    ['15.4', 'Double Circulation'],
    ['15.5', 'Regulation of Cardiac Activity'],
    ['15.6', 'Disorders of Circulatory System']
  ]],
  [16, 'Excretory Products and their Elimination', null, [
    ['16.1', 'Human Excretory System'],
    ['16.2', 'Urine Formation'],
    ['16.3', 'Function of the Tubules'],
    ['16.4', 'Mechanism of Concentration of the Filtrate'],
    ['16.5', 'Regulation of Kidney Function'],
    ['16.6', 'Micturition'],
    ['16.7', 'Role of other Organs in Excretion'],
    ['16.8', 'Disorders of the Excretory System']
  ]],
  [17, 'Locomotion and Movement', null, [
    ['17.1', 'Types of Movement'],
    ['17.2', 'Muscle'],
    ['17.3', 'Skeletal System'],
    ['17.4', 'Joints'],
    ['17.5', 'Disorders of Muscular and Skeletal System']
  ]],
  [18, 'Neural Control and Coordination', null, [
    ['18.1', 'Neural System'],
    ['18.2', 'Human Neural System'],
    ['18.3', 'Neuron as Structural and Functional Unit of Neural System'],
    ['18.4', 'Central Neural System'],
    ['18.5', 'Reflex Action and Reflex Arc'],
    ['18.6', 'Sensory Reception and Processing']
  ]],
  [19, 'Chemical Coordination and Integration', null, [
    ['19.1', 'Endocrine Glands and Hormones'],
    ['19.2', 'Human Endocrine System'],
    ['19.3', 'Hormones of Heart, Kidney and Gastrointestinal Tract'],
    ['19.4', 'Mechanism of Hormone Action']
  ]]
]

// English — NCERT "Hornbill".
const ENGLISH = [
  [1, 'The Portrait of a Lady', null, [
    ['1.1', 'Understanding the text'],
    ['1.2', 'Talking about the text'],
    ['1.3', 'Thinking about language'],
    ['1.4', 'Working with words'],
    ['1.5', 'Noticing form'],
    ['1.6', 'Things to do']
  ]],
  [2, 'A Photograph', null, [
    ['2.1', 'Think it out']
  ]],
  [3, '"We\'re Not Afraid to Die... if We Can All Be Together"', null, [
    ['3.1', 'Understanding the text'],
    ['3.2', 'Talking about the text'],
    ['3.3', 'Thinking about language'],
    ['3.4', 'Working with words'],
    ['3.5', 'Things to do']
  ]],
  [4, 'Discovering Tut: the Saga Continues', null, [
    ['4.1', 'Understanding the text'],
    ['4.2', 'Talking about the text'],
    ['4.3', 'Thinking about language'],
    ['4.4', 'Working with words'],
    ['4.5', 'Things to do']
  ]],
  [5, 'The Laburnum Top', null, [
    ['5.1', 'Find out'],
    ['5.2', 'Think it out'],
    ['5.3', 'Note down'],
    ['5.4', 'List the following'],
    ['5.5', 'Thinking about language'],
    ['5.6', 'Try this out']
  ]],
  [6, 'The Voice of the Rain', null, [
    ['6.1', 'Think it out'],
    ['6.2', 'Thinking about language'],
    ['6.3', 'Look for some other poems']
  ]],
  [7, "The Ailing Planet: the Green Movement's Role", null, [
    ['7.1', 'Understanding the text'],
    ['7.2', 'Talking about the text'],
    ['7.3', 'Thinking about language'],
    ['7.4', 'Working with words'],
    ['7.5', 'Things to do']
  ]],
  [8, 'Childhood', null, [
    ['8.1', 'Think it out']
  ]],
  [9, 'The Adventure', null, [
    ['9.1', 'Understanding the text'],
    ['9.2', 'Talking about the text'],
    ['9.3', 'Thinking about language'],
    ['9.4', 'Working with words'],
    ['9.5', 'Noticing form'],
    ['9.6', 'Things to do']
  ]],
  [10, 'Silk Road', null, [
    ['10.1', 'Understanding the text'],
    ['10.2', 'Talking about the text'],
    ['10.3', 'Thinking about language'],
    ['10.4', 'Working with words'],
    ['10.5', 'Noticing form'],
    ['10.6', 'Things to do']
  ]],
  [11, 'Father to Son', null, [
    ['11.1', 'Think it out']
  ]],
  [12, 'Writing Skills', null, [
    ['12.1', 'Note-making'],
    ['12.2', 'Summarising'],
    ['12.3', 'Sub-titling'],
    ['12.4', 'Essay-writing'],
    ['12.5', 'Letter-writing'],
    ['12.6', 'Creative Writing']
  ]]
]

export const CLASS_11 = {
  Physics: expand('p11_', PHYSICS),
  Chemistry: expand('c11_', CHEMISTRY),
  Maths: expand('m11_', MATHS),
  Biology: expand('b11_', BIOLOGY),
  English: expand('e11_', ENGLISH)
}
