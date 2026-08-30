const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'app/docencia/page.tsx',
  'app/registro/page.tsx',
  'app/vinculacion/difusion/page.tsx',
  'app/vinculacion/encuesta/page.tsx',
  'app/vinculacion/test-mcer/page.tsx',
  'app/pine-dashboard/page.tsx'
];

filesToUpdate.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Add Link import if not present
  if (!content.includes('import Link from')) {
    content = content.replace(/(import {[^}]+} from 'react';\r?\n)/, "$1import Link from 'next/link';\n");
  }

  // Inject the button right after `<div className="max-w-...` or `<div className="... mx-auto ..."`
  // We'll look for `<div className="min-h-screen...` followed by the next `<div` wrapper.
  const regex = /(<div className="[^"]*max-w-[^"]*mx-auto[^"]*">)/;
  
  if (regex.test(content) && !content.includes('Volver al Portal PINE')) {
    content = content.replace(regex, `$1\n        <div className="mb-4">\n          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">\n            &larr; Volver al Portal PINE\n          </Link>\n        </div>`);
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  } else {
    console.log(`Could not update ${file} automatically.`);
  }
});
