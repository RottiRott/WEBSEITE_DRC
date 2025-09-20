import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const docsDir = path.join(projectRoot, 'docs');
const indexPath = path.join(docsDir, 'index.html');
const partialsDir = path.join(docsDir, 'partials');
const snippetsDir = path.join(docsDir, 'snippets');

const SECTION_NAMES = [
  'header',
  'hero',
  'about',
  'video',
  'gallery',
  'services',
  'testimonials',
  'faq',
  'contact',
  'footer'
];

const GROUPS = [
  {
    name: 'intro',
    title: 'Einstieg & Über-uns-Block',
    sections: ['header', 'hero', 'about']
  },
  {
    name: 'showcase',
    title: 'Video, Galerie & Leistungen',
    sections: ['video', 'gallery', 'services']
  },
  {
    name: 'trust',
    title: 'Kundenstimmen & FAQ',
    sections: ['testimonials', 'faq']
  },
  {
    name: 'closing',
    title: 'Kontakt & Footer',
    sections: ['contact', 'footer']
  }
];

const findTag = (source, tag) => {
  const openIndex = source.indexOf(tag);
  if (openIndex === -1) {
    throw new Error(`Tag ${tag} wurde nicht gefunden.`);
  }
  const closeIndex = source.indexOf('>', openIndex);
  if (closeIndex === -1) {
    throw new Error(`Tag ${tag} ist unvollständig.`);
  }
  return source.slice(openIndex, closeIndex + 1);
};

const extractScriptBlock = (source, marker) => {
  const startIndex = source.indexOf(marker);
  if (startIndex === -1) {
    throw new Error('Der Inline-Skriptblock konnte nicht gefunden werden.');
  }
  const scriptStart = source.indexOf('<script>', startIndex);
  if (scriptStart === -1) {
    throw new Error('Der Inline-Skriptblock beginnt nicht wie erwartet.');
  }
  const scriptEnd = source.indexOf('</script>', scriptStart);
  if (scriptEnd === -1) {
    throw new Error('Der Inline-Skriptblock endet nicht wie erwartet.');
  }
  return {
    script: source.slice(scriptStart, scriptEnd + '</script>'.length),
    endIndex: scriptEnd + '</script>'.length
  };
};

const updateTitle = (headContent, title) => {
  return headContent.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
};

const createSnippetDocument = (
  htmlTag,
  headContent,
  bodyTag,
  wrapperOpen,
  sectionHtml,
  inlineScript,
  trailingScripts
) => {
  const trimmedSection = sectionHtml.trim();
  const cleanedTrailing = trailingScripts.trim();
  return `<!DOCTYPE html>\n${htmlTag}\n<head>${headContent}\n</head>\n${bodyTag}\n${wrapperOpen}\n${trimmedSection}\n</div>\n\n${inlineScript}\n${cleanedTrailing}\n`;
};

(async () => {
  const indexHtml = await fs.readFile(indexPath, 'utf8');

  const htmlTag = findTag(indexHtml, '<html');
  const bodyTag = findTag(indexHtml, '<body');
  const wrapperOpen = '<div class="relative w-full overflow-x-hidden">';

  const headStart = indexHtml.indexOf('<head>');
  const headEnd = indexHtml.indexOf('</head>');
  if (headStart === -1 || headEnd === -1) {
    throw new Error('Der <head>-Bereich konnte nicht ermittelt werden.');
  }
  const headContentOriginal = indexHtml.slice(headStart + '<head>'.length, headEnd);

  const footerMarker = '<!-- partial:footer:end -->';
  const { script: inlineScript, endIndex: scriptEndIndex } = extractScriptBlock(indexHtml, footerMarker);
  const wrapperCloseIndex = indexHtml.indexOf('</div>', scriptEndIndex);
  if (wrapperCloseIndex === -1) {
    throw new Error('Das schließende Wrapper-DIV wurde nicht gefunden.');
  }
  const trailingScripts = indexHtml.slice(wrapperCloseIndex + '</div>'.length, indexHtml.length);

  await fs.rm(partialsDir, { recursive: true, force: true });
  await fs.rm(snippetsDir, { recursive: true, force: true });
  await fs.mkdir(partialsDir, { recursive: true });
  await fs.mkdir(snippetsDir, { recursive: true });

  const sectionFragments = new Map();

  for (const sectionName of SECTION_NAMES) {
    const startMarker = `<!-- partial:${sectionName}:start -->`;
    const endMarker = `<!-- partial:${sectionName}:end -->`;
    const startIndex = indexHtml.indexOf(startMarker);
    const endIndex = indexHtml.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      throw new Error(`Marker für ${sectionName} wurde nicht gefunden.`);
    }

    const contentStart = startIndex + startMarker.length;
    if (contentStart > endIndex) {
      throw new Error(`Ungültiger Bereich für ${sectionName}.`);
    }

    const fragment = indexHtml.slice(contentStart, endIndex).trim();
    sectionFragments.set(sectionName, fragment);
  }

  for (const group of GROUPS) {
    const fragments = group.sections.map(sectionName => {
      if (!sectionFragments.has(sectionName)) {
        throw new Error(`Kein Fragment für ${sectionName} vorhanden.`);
      }
      return sectionFragments.get(sectionName);
    });

    const combinedFragment = fragments.join('\n\n');
    const partialPath = path.join(partialsDir, `${group.name}.html`);
    await fs.writeFile(partialPath, `${combinedFragment}\n`, 'utf8');

    const snippetHead = updateTitle(headContentOriginal, `${group.title} – DachrinneCheck`);
    const snippetHtml = createSnippetDocument(
      htmlTag,
      snippetHead,
      bodyTag,
      wrapperOpen,
      combinedFragment,
      inlineScript,
      trailingScripts
    );
    const snippetPath = path.join(snippetsDir, `${group.name}.html`);
    await fs.writeFile(snippetPath, snippetHtml, 'utf8');
  }

  console.log(`Erfolgreich ${GROUPS.length} kombinierte Abschnitte in ${partialsDir} und ${snippetsDir} geschrieben.`);
})();
