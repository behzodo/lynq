import {
  HTML_SCRIPT,
  type IntegrationId,
  JAVASCRIPT_SCRIPT,
  NEXTJS_SCRIPT,
  REACT_SCRIPT,
} from "./constants";

const TEMPLATES: Record<string, string> = {
  html: HTML_SCRIPT,
  react: REACT_SCRIPT,
  nextjs: NEXTJS_SCRIPT,
  javascript: JAVASCRIPT_SCRIPT,
};

/**
 * Builds the embed snippet. When a department is given, the department
 * attribute is added the same way that template already sets the organization
 * one - inline for HTML, `setAttribute` for the script-injecting variants, a
 * JSX prop for Next.js - so the result stays copy-pasteable.
 */
export const createScript = (
  integrationId: IntegrationId,
  organizationId: string,
  departmentId?: string,
) => {
  const template = TEMPLATES[integrationId];

  if (!template) {
    return "";
  }

  const script = template.replace(/{{ORGANIZATION_ID}}/g, organizationId);

  if (!departmentId) {
    return script;
  }

  return (
    script
      // script.setAttribute("data-organization-id", "...");
      .replace(
        /^([ \t]*)script\.setAttribute\("data-organization-id".*$/m,
        (line, indent: string) =>
          `${line}\n${indent}script.setAttribute("data-department-id", "${departmentId}");`,
      )
      // A JSX prop on its own line
      .replace(
        /^([ \t]*)data-organization-id="[^"]*"$/m,
        (line, indent: string) =>
          `${line}\n${indent}data-department-id="${departmentId}"`,
      )
      // A single-line <script> tag
      .replace(
        /(data-organization-id="[^"]*")(?=><\/script>)/,
        `$1 data-department-id="${departmentId}"`,
      )
  );
};
