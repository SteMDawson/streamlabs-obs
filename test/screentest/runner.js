const rimraf = require('rimraf');
const { execSync } = require('child_process');
const fs = require('fs');

const CONFIG = JSON.parse(fs.readFileSync('test/screentest/config.json'));

const branches = [
  execSync('git log').toString().split('\n')[0].split(' ')[1],
  CONFIG.baseBranch
];

(function main() {

  const dir = CONFIG.dist;
  rimraf.sync(dir);

  // create dir
  let currentPath = '';
  dir.split('/').forEach(dirName => {
    currentPath += dirName;
    if (!fs.existsSync(currentPath)) fs.mkdirSync(currentPath);
    currentPath += '/';
  });


  for (const branchName of branches) {

    fs.mkdirSync(`${dir}/${branchName}`);

    execSync(`git checkout ${branchName}`);


    log('project compilation');
    try {
      execSync('yarn compile');
    } catch (e) {
      err('compilation failed', e);
      return;
    }

    log('tests compilation');

    try {
      execSync('yarn compile-tests');
    } catch (e) {
      err('compilation failed', e);
      return;
    }

    log('creating screenshots');
    try {
      execSync(`yarn ava test-dist/test/screentest/tests`);
    } catch (e) {
      err('creating screenshots failed');
      return;
    }

  }

  execSync(`git checkout ${branches[0]}`);

  log('comparing screenshots');
  try {
    execSync(`node test-dist/test/screentest/comparator.js ${branches[0]} ${branches[1]}`);
  } catch (e) {
    err('comparing screenshots failed');
    return;
  }

})();

execSync(`git checkout ${branches[0]}`);


function log(...args) {
  console.log(...args);
}

function err(...args) {
  console.error(...args);
}
