"""Synthetic command harness: no device, account, repository or profile changes."""
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
SOURCE = Path(__file__).with_name('renew-free-signing.sh')
class Renewal(unittest.TestCase):
 def run_case(self, branch='main', dirty=False, revision='synthetic-new', installed='synthetic-old', fail=''):
  tmp=tempfile.TemporaryDirectory(); self.addCleanup(tmp.cleanup); root=Path(tmp.name); state=root/'state'; state.mkdir(); bins=root/'bin'; bins.mkdir()
  (state/'free-signing-last-success').write_text(str(int(__import__('time').time())))
  (state/'free-signing-last-revision').write_text(installed+'\n')
  mock='''#!/usr/bin/python3
import os,sys,time
from pathlib import Path
name=Path(sys.argv[0]).name; args=sys.argv[1:]
p=Path(os.environ['MOCK_LOG']); p.open('a').write(name+' '+ ' '.join(args)+'\\n')
if os.environ.get('MOCK_FAIL')==name: sys.exit(7)
if name=='git':
 if '--show-toplevel' in args: print(os.environ['MOCK_ROOT'])
 elif '--show-current' in args: print(os.environ['MOCK_BRANCH'])
 elif 'status' in args: print(' M synthetic.txt' if os.environ['MOCK_DIRTY']=='1' else '')
 elif 'HEAD' in args: print(os.environ['MOCK_REVISION'])
'''
  for name in ['git','xcodebuild','xcrun']:
   p=bins/name; p.write_text(mock); p.chmod(0o700)
  script=SOURCE.read_text().replace('export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin"',f'export PATH="{bins}:/usr/bin:/bin"').replace('readonly STATE_DIR="${HOME}/Library/Application Support/SegundoCerebroHealthBridge"',f'readonly STATE_DIR="{state}"')
  path=root/'renew.zsh'; path.write_text(script)
  env=dict(os.environ,HEALTH_BRIDGE_DEVICE_ID='SYNTHETIC_DEVICE',HEALTH_BRIDGE_TEAM_ID='SYNTHETIC_TEAM',MOCK_ROOT=str(root),MOCK_BRANCH=branch,MOCK_DIRTY=str(int(dirty)),MOCK_REVISION=revision,MOCK_FAIL=fail,MOCK_LOG=str(root/'commands'))
  result=subprocess.run(['/bin/zsh',str(path)],env=env,capture_output=True,text=True)
  return result,state,(root/'commands').read_text()
 def test_new_revision_installs_even_with_recent_signature(self):
  r,s,log=self.run_case(); self.assertEqual(r.returncode,0,r.stderr); self.assertIn('xcodebuild ',log); self.assertIn('device install app',log); self.assertEqual((s/'free-signing-last-revision').read_text().strip(),'synthetic-new')
 def test_same_recent_revision_skips_device(self):
  r,s,log=self.run_case(installed='synthetic-new'); self.assertEqual(r.returncode,0); self.assertNotIn('xcodebuild ',log); self.assertNotIn('xcrun ',log)
 def test_build_failure_preserves_installed_revision(self):
  r,s,log=self.run_case(fail='xcodebuild'); self.assertNotEqual(r.returncode,0); self.assertEqual((s/'free-signing-last-revision').read_text().strip(),'synthetic-old'); self.assertTrue((s/'free-signing-last-error').exists()); self.assertNotIn('xcrun ',log)
 def test_install_failure_preserves_installed_revision(self):
  r,s,log=self.run_case(fail='xcrun'); self.assertNotEqual(r.returncode,0); self.assertEqual((s/'free-signing-last-revision').read_text().strip(),'synthetic-old'); self.assertTrue((s/'free-signing-last-error').exists())
 def test_dirty_checkout_is_preserved_and_error_visible(self):
  r,s,log=self.run_case(dirty=True); self.assertNotEqual(r.returncode,0); self.assertNotIn('fetch ',log); self.assertNotIn('xcodebuild ',log); self.assertTrue((s/'free-signing-last-error').exists())
 def test_non_main_is_preserved(self):
  r,s,log=self.run_case(branch='codex/synthetic'); self.assertNotEqual(r.returncode,0); self.assertNotIn('fetch ',log); self.assertNotIn('xcodebuild ',log)
if __name__=='__main__': unittest.main()
