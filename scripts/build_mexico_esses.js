import fs from 'fs';

// Turn 3 exit is at 120, 10.
// Let's look at the remaining circuit start.
// The stadium entry is M 160.19 35.14? Wait, if 160,35 is the start, that means the rest of the track goes from 160,35 to 402,111 (which might be the back straight or stadium?).
// Actually, let's dump the SVG to an HTML file to view it!

const svgPath = fs.readFileSync('src/assets/tracks/mexico.svg', 'utf8');

const html = `
<!DOCTYPE html>
<html>
<body style="background:#222; color:white;">
  <svg width="900" height="700" viewBox="0 0 422 308" style="border:1px solid #555;">
    ${svgPath.replace('<svg', '<g').replace('</svg>', '</g>')}
    <path d="${svgPath.match(/d="([^"]+)"/)[1]}" fill="none" stroke="red" stroke-width="1.5" />
    
    <!-- add some markers -->
    <circle cx="120" cy="10" r="3" fill="blue" /> <!-- T3 exit -->
    <text x="120" y="8" fill="blue" font-size="5">T3 exit</text>
    
    <circle cx="160.19" cy="35.14" r="3" fill="lime" /> <!-- Start of path -->
    <text x="160" y="32" fill="lime" font-size="5">Start of path</text>
  </svg>
</body>
</html>
`;
fs.writeFileSync('scratch/view_mexico.html', html);
console.log('HTML written to scratch/view_mexico.html');
