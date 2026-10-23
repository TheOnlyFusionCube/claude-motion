# Publishing this staged repository

This directory is ready to serve as the **root of a standalone public GitHub repository** named `claude-motion`. It is **not yet published**.

## Fast path (GitHub CLI)

Prerequisites: `git` and `gh` installed; log in once with `gh auth login` if needed. Review the third-party source rights notice in `NOTICE.md` before publishing publicly.

From this directory run:

```bash
bash scripts/publish-github.sh TheOnlyFusionCube/claude-motion
```

The script checks your login and local git state, creates an initial commit, creates a **public** repository on your GitHub account, and pushes `main`. It doesn't execute itself; running it is your explicit opt-in.

## Manual Git CLI path

If you prefer to create the repository at https://github.com/new, use the repository name `claude-motion`. **Do not initialize** the new GitHub repository with a README, license or `.gitignore` because those files already exist here.

```bash
git init -b main
git add .
git commit -m "Initial release: claude-motion portable Agent Skill"
git remote add origin https://github.com/TheOnlyFusionCube/claude-motion.git
git push -u origin main
```

Your local `git` may ask you to configure an author name/email, and pushing requires GitHub authentication. Create the empty GitHub repository **before** adding the remote and pushing.

## Browser-only path

1. Create a new empty repository at https://github.com/new named `claude-motion`.
2. Unzip `claude-motion-github.zip` on your computer.
3. Upload the **contents of the extracted `claude-motion/` folder**, preserving the subdirectories and the hidden `.github/` directory. Do not upload the ZIP itself as a single file.
4. Commit files on the `main` branch, then open the repository README to confirm links and checks.

## After publishing

- GitHub repository: `https://github.com/TheOnlyFusionCube/claude-motion`
- Install command: `npx skills add TheOnlyFusionCube/claude-motion`
- CI workflow: **Validate skill** (unit tests, offline source parity, scene schema)

If you publish under a different GitHub owner/name, update the installation command, the `origin` URL, and README links.

## Release checklist

- [ ] You have reviewed redistribution rights for the verbatim `references/upstream/` documents.
- [ ] `npm run check` passes locally (Node 22+).
- [ ] `README.md`, `SKILL.md`, `SOURCE.md`, `NOTICE.md` and `LICENSE` are present.
- [ ] You have selected the repository's intended visibility and reviewed every file for secrets.
- [ ] The `main` branch push succeeds and GitHub CI passes.
- [ ] The clone/install instructions work from a new directory.
