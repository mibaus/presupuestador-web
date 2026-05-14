import fs from 'fs';

const appFile = 'src/App.jsx';
let content = fs.readFileSync(appFile, 'utf8');

const availableCabinsStr = `
// Puedes editar los textos de las cabañas aquí:
const AVAILABLE_CABINS = [
  { id: 1, label: "Cabaña 1 (Standard)" },
  { id: 2, label: "Cabaña 2" },
  { id: 3, label: "Cabaña 3" },
  { id: 4, label: "Cabaña 4" },
  { id: 5, label: "Cabaña 5" },
  { id: 6, label: "Cabaña 6" },
  { id: 7, label: "Cabaña 7" },
  { id: 9, label: "Cabaña 9" },
  { id: 10, label: "Cabaña 10" },
  { id: 11, label: "Cabaña 11" },
  { id: 12, label: "Cabaña 12" }
];

function App() {`;

// Insert AVAILABLE_CABINS if it doesn't exist
if (!content.includes('const AVAILABLE_CABINS =')) {
    content = content.replace('function App() {', availableCabinsStr);
}

// Replace button content
const oldButton = `<span>{selectedCabin ? \`Cabaña \${selectedCabin}\` : 'Selecciona...'}</span>
                <CaretDown className={\`w-5 h-5 transition-transform duration-300 \${isDropdownOpen ? 'rotate-180' : ''}\`} weight="bold" />`;

const newButton = `<span>
                  {selectedCabin 
                    ? AVAILABLE_CABINS.find(c => c.id === selectedCabin)?.label || \`Cabaña \${selectedCabin}\`
                    : 'Selecciona...'}
                </span>
                <CaretDown className={\`w-5 h-5 transition-transform duration-300 \${isDropdownOpen ? 'rotate-180' : ''}\`} weight="bold" />`;

if (content.includes(oldButton)) {
    content = content.replace(oldButton, newButton);
}

// Replace map
const oldMap = `{[1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12].map(num => {
                    const isSelected = selectedCabin === num;`;

const newMap = `{AVAILABLE_CABINS.map(cabin => {
                    const num = cabin.id;
                    const isSelected = selectedCabin === num;`;

if (content.includes(oldMap)) {
    content = content.replace(oldMap, newMap);
}

// Replace span text
const oldSpan = `<span className={\`font-medium text-lg \${isSelected ? 'font-bold' : ''}\`}>Cabaña {num}</span>`;
const newSpan = `<span className={\`font-medium text-lg \${isSelected ? 'font-bold' : ''}\`}>{cabin.label}</span>`;

if (content.includes(oldSpan)) {
    content = content.replace(oldSpan, newSpan);
}

fs.writeFileSync(appFile, content, 'utf8');
console.log("Done");
