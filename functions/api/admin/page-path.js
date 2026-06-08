import { isAuthed, jsonResponse } from './_utils.js';
import { getFileFromGitHub, commitFileToGitHub, getFileSha } from './_github.js';

/* PUT /api/admin/page-path — cascade page path changes
   Updates routes.json, nav.json, footer.json, and internal links when a page's URL path changes.
   Creates a redirect mapping for the old path.

   Body: { pageKey, oldPath, newPath }
*/
export async function onRequest(context) {
  if (context.request.method !== 'PUT') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!isAuthed(context)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const { pageKey, oldPath, newPath } = await context.request.json();

  if (!pageKey || !oldPath || !newPath) {
    return jsonResponse({ error: 'Missing pageKey, oldPath, or newPath' }, 400);
  }

  if (!newPath.startsWith('/')) {
    return jsonResponse({ error: 'newPath must start with /' }, 400);
  }

  const env = context.env;
  const repo = env.GITHUB_REPO;
  const branch = env.GITHUB_BRANCH;

  try {
    // 1. Get and update routes.json
    const routesContent = await getFileFromGitHub(env, 'src/data/routes.json', repo, branch);
    const routesData = JSON.parse(routesContent);

    const routeIdx = routesData.routes.findIndex(r => r.key === pageKey);
    if (routeIdx < 0) {
      throw new Error(`Page key "${pageKey}" not found in routes.json`);
    }

    routesData.routes[routeIdx].path = newPath;

    // 2. Get and update nav.json
    const navContent = await getFileFromGitHub(env, 'src/data/nav.json', repo, branch);
    const navData = JSON.parse(navContent);

    const updateNavHrefs = (items) => {
      (items || []).forEach(item => {
        if (item.href === oldPath) item.href = newPath;
        if (item.items) updateNavHrefs(item.items);
      });
    };
    updateNavHrefs(navData.items);

    // 3. Get and update footer.json
    const footerContent = await getFileFromGitHub(env, 'src/data/footer.json', repo, branch);
    const footerData = JSON.parse(footerContent);

    (footerData.columns || []).forEach(col => {
      (col.links || []).forEach(link => {
        if (link.href === oldPath) link.href = newPath;
      });
    });

    // 4. Get and update page-compositions.json for internal links
    const compContent = await getFileFromGitHub(env, 'src/data/page-compositions.json', repo, branch);
    const compData = JSON.parse(compContent);

    const updateCTAsInContent = (content) => {
      if (content && typeof content === 'object') {
        if (content.ctaPrimary?.href === oldPath) content.ctaPrimary.href = newPath;
        if (content.ctaSecondary?.href === oldPath) content.ctaSecondary.href = newPath;
        if (content.cta?.href === oldPath) content.cta.href = newPath;
        // Recurse into arrays and objects
        Object.values(content).forEach(val => {
          if (Array.isArray(val)) val.forEach(item => updateCTAsInContent(item));
          else if (val && typeof val === 'object') updateCTAsInContent(val);
        });
      }
    };

    (compData.pages || []).forEach(page => {
      (page.sections || []).forEach(section => {
        if (section.content) updateCTAsInContent(section.content);
      });
    });

    // 5. Add redirect mapping (store in routes.json as optional _redirects field)
    if (!routesData._redirects) routesData._redirects = [];
    routesData._redirects.push({ from: oldPath, to: newPath, timestamp: new Date().toISOString() });

    // 6. Commit all changes
    const files = [
      { path: 'src/data/routes.json', content: JSON.stringify(routesData, null, 2) },
      { path: 'src/data/nav.json', content: JSON.stringify(navData, null, 2) },
      { path: 'src/data/footer.json', content: JSON.stringify(footerData, null, 2) },
      { path: 'src/data/page-compositions.json', content: JSON.stringify(compData, null, 2) },
    ];

    for (const file of files) {
      await commitFileToGitHub(
        env,
        file.path,
        file.content,
        `Cascade: update "${oldPath}" → "${newPath}" in ${file.path.split('/').pop()}`,
        repo,
        branch
      );
    }

    // Return updated page compositions
    return jsonResponse({
      success: true,
      message: `Path updated: ${oldPath} → ${newPath}. All references cascaded. Redirect created.`,
      pages: compData.pages,
    });

  } catch (err) {
    console.error('[page-path]', err);
    return jsonResponse({ error: err.message }, 500);
  }
}
