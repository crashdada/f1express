import sys
import os

# Add the project root and collector directory to sys.path for tests
project_root = os.path.dirname(os.path.abspath(__file__))
collector_dir = os.path.join(project_root, 'collector')

if collector_dir not in sys.path:
    sys.path.insert(0, collector_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)
