import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type {
  PraxisSkillRecord,
  PraxisSkillRegistrySnapshot,
  PraxisSkillSurface,
  PraxisSkillTrust,
} from "../shared/skillRegistry";

type SkillFrontMatter = {
  name?: string;
  description?: string;
  surfaces?: string[];
  data_sources?: string[];
  trust?: string;
};

const VALID_SURFACES = new Set<PraxisSkillSurface>(["desktop", "slack", "voice", "companion"]);
const VALID_TRUST = new Set<PraxisSkillTrust>(["built-in", "workspace"]);

const normalizeListItem = (value: string) => value.replace(/^["']|["']$/g, "").trim();

const parseFrontMatter = (raw: string): { frontMatter: SkillFrontMatter; content: string } => {
  const normalized = raw.replace(/^\uFEFF/, "");
  if (!normalized.startsWith("---\n") && !normalized.startsWith("---\r\n")) {
    return { frontMatter: {}, content: normalized };
  }

  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { frontMatter: {}, content: normalized };
  }

  const frontMatter: SkillFrontMatter = {};
  const lines = match[1].split(/\r?\n/);
  let currentListKey: "surfaces" | "data_sources" | null = null;

  for (const line of lines) {
    const listMatch = line.match(/^\s*-\s+(.+)$/);
    if (listMatch && currentListKey) {
      frontMatter[currentListKey] = [
        ...(frontMatter[currentListKey] ?? []),
        normalizeListItem(listMatch[1]),
      ];
      continue;
    }

    const keyValueMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/);
    if (!keyValueMatch) {
      currentListKey = null;
      continue;
    }

    const key = keyValueMatch[1] as keyof SkillFrontMatter;
    const value = normalizeListItem(keyValueMatch[2]);
    currentListKey = null;

    if (key === "surfaces" || key === "data_sources") {
      frontMatter[key] = value
        ? value.split(",").map((item) => normalizeListItem(item)).filter(Boolean)
        : [];
      currentListKey = key;
      continue;
    }

    if (key === "name" || key === "description" || key === "trust") {
      frontMatter[key] = value;
    }
  }

  return {
    frontMatter,
    content: normalized.slice(match[0].length),
  };
};

const firstMarkdownHeading = (content: string) => {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading && heading.length > 0 ? heading : null;
};

const folderNameFromPath = (skillPath: string) => path.basename(path.dirname(skillPath));

const compareSkills = (left: PraxisSkillRecord, right: PraxisSkillRecord) =>
  left.name.localeCompare(right.name);

const resolveSkillsRoot = (rootOverride?: string) =>
  rootOverride ?? path.join(process.env.APP_ROOT, "skills");

const parseSkillFile = (skillsRoot: string, skillPath: string, loadedAt: string): PraxisSkillRecord => {
  const raw = readFileSync(skillPath, "utf8");
  const { frontMatter, content } = parseFrontMatter(raw);
  const fallbackName = folderNameFromPath(skillPath);
  const warnings: string[] = [];

  const surfaces = (frontMatter.surfaces ?? [])
    .map((surface) => surface.toLowerCase())
    .filter((surface): surface is PraxisSkillSurface => {
      const valid = VALID_SURFACES.has(surface as PraxisSkillSurface);
      if (!valid) {
        warnings.push(`Ignoring unsupported surface '${surface}'.`);
      }
      return valid;
    });

  if (surfaces.length === 0) {
    warnings.push("No valid surfaces declared.");
  }

  const trust = frontMatter.trust && VALID_TRUST.has(frontMatter.trust as PraxisSkillTrust)
    ? (frontMatter.trust as PraxisSkillTrust)
    : "workspace";
  if (frontMatter.trust && trust !== frontMatter.trust) {
    warnings.push(`Unsupported trust '${frontMatter.trust}' was treated as workspace.`);
  }

  const name = frontMatter.name?.trim() || fallbackName;
  const title = firstMarkdownHeading(content) ?? name;
  const description = frontMatter.description?.trim() || "";
  if (!description) {
    warnings.push("No description declared.");
  }

  return {
    id: name.toLowerCase(),
    name,
    description,
    surfaces,
    dataSources: frontMatter.data_sources ?? [],
    trust,
    relativePath: path.relative(skillsRoot, skillPath).replace(/\\/g, "/"),
    title,
    content: content.trim(),
    loadedAt,
    warnings,
  };
};

export const getSkillRegistrySnapshot = (rootOverride?: string): PraxisSkillRegistrySnapshot => {
  const skillsRoot = resolveSkillsRoot(rootOverride);
  const indexedAt = new Date().toISOString();
  const warnings: string[] = [];

  if (!existsSync(skillsRoot)) {
    return {
      ok: false,
      skillsRoot,
      indexedAt,
      skillCount: 0,
      skills: [],
      warnings: [`Skills root does not exist: ${skillsRoot}`],
    };
  }

  const skillFiles = readdirSync(skillsRoot)
    .map((entry) => path.join(skillsRoot, entry, "SKILL.md"))
    .filter((skillPath) => existsSync(skillPath) && statSync(skillPath).isFile());

  const skills = skillFiles
    .map((skillPath) => parseSkillFile(skillsRoot, skillPath, indexedAt))
    .sort(compareSkills);
  const seenNames = new Set<string>();

  for (const skill of skills) {
    if (seenNames.has(skill.id)) {
      warnings.push(`Duplicate skill name found: ${skill.name}`);
    }
    seenNames.add(skill.id);
    for (const skillWarning of skill.warnings) {
      warnings.push(`${skill.name}: ${skillWarning}`);
    }
  }

  return {
    ok: warnings.length === 0,
    skillsRoot,
    indexedAt,
    skillCount: skills.length,
    skills,
    warnings,
  };
};
