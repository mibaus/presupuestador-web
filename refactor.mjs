import fs from 'fs';

const appFile = 'src/App.jsx';
let content = fs.readFileSync(appFile, 'utf8');

content = content.replace(/numberOfPeople/g, "selectedCabin");
content = content.replace(/setNumberOfPeople/g, "setSelectedCabin");
content = content.replace(/peopleBands/g, "cabinBands");
content = content.replace(/oneNightPeopleBands/g, "oneNightCabinBands");
content = content.replace(/pickBandForPeople/g, "pickBandForCabin");

const oldLogicOriginal = `const pickBandForCabin = (tariffs, people) => {
  if (!tariffs || !Array.isArray(tariffs.cabinBands)) return null;
  const bands = [...tariffs.cabinBands].sort((a, b) => a.people - b.people);
  const exact = bands.find(b => b.people === people);
  if (exact) return exact;
  const higher = bands.find(b => b.people >= people);
  if (higher) return higher;
  return bands[bands.length - 1] || null;
};`;

const newLogic = `const pickBandForCabin = (tariffs, cabin) => {
  if (!tariffs || !Array.isArray(tariffs.cabinBands)) return null;
  const bands = [...tariffs.cabinBands].sort((a, b) => a.cabin - b.cabin);
  const exact = bands.find(b => b.cabin === parseInt(cabin));
  if (exact) return exact;
  return null;
};`;

if (content.includes(oldLogicOriginal)) {
    content = content.replace(oldLogicOriginal, newLogic);
} else {
    console.log("Could not find old logic block.");
}

content = content.replace(/b\.people/g, "b.cabin");
content = content.replace(/people: 1/g, "cabin: 1");
content = content.replace(/people: n/g, "cabin: n");

const oldInput = `<label className={\`block text-base font-medium \${isDarkMode ? 'text-slate-300' : 'text-gray-600'}\`}>Cantidad de huéspedes</label>
            <input
              ref={peopleInputRef}
              type="number"
              inputMode="numeric"
              value={selectedCabin}
              onChange={(e) => {
                setSelectedCabin(e.target.value);
                if (e.target.value.length > 0) {
                  setTimeout(() => { if (nightsInputRef.current) nightsInputRef.current.focus(); }, 1500);
                }
              }}
              className={\`w-full text-xl font-bold bg-transparent border-0 border-b \${isDarkMode ? 'border-slate-700 text-white' : 'border-gray-200 text-gray-900'} focus:outline-none focus:ring-0 pb-2\`}
            />`;

const newInput = `<label className={\`block text-base font-medium \${isDarkMode ? 'text-slate-300' : 'text-gray-600'}\`}>Cabaña</label>
            <select
              ref={peopleInputRef}
              value={selectedCabin}
              onChange={(e) => {
                setSelectedCabin(e.target.value);
                setTimeout(() => { if (nightsInputRef.current) nightsInputRef.current.focus(); }, 150);
              }}
              className={\`w-full text-xl font-bold bg-transparent border-0 border-b \${isDarkMode ? 'border-slate-700 text-white' : 'border-gray-200 text-gray-900'} focus:outline-none focus:ring-0 pb-2\`}
            >
              <option value="">Selecciona...</option>
              {[1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12].map(num => (
                <option key={num} value={num}>Cabaña {num}</option>
              ))}
            </select>`;

if (content.includes(oldInput)) {
    content = content.replace(oldInput, newInput);
} else {
    console.log("Could not find old input block.");
}

content = content.replace(/Tarifas por huéspedes/g, "Tarifas por Cabaña");
content = content.replace(/Personas/g, "Cabaña");
content = content.replace(/Precio por persona/g, "Precio por cabaña");

fs.writeFileSync(appFile, content, 'utf8');
console.log("Done");
