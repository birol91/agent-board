export interface SkillFrontmatter {
  name: string;
  description: string;
}

export interface Skill {
  frontmatter: SkillFrontmatter;
  body: string;
  folderPath: string;
  hasReferences: boolean;
  hasAssets: boolean;
}
