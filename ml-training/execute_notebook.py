import os
import nbformat
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
import base64

NOTEBOOK_PATH = os.path.join('ml-training', 'notebooks', 'eda_features_front.ipynb')

def execute_notebook_manually():
    print(f"Reading notebook '{NOTEBOOK_PATH}'...")
    with open(NOTEBOOK_PATH, 'r', encoding='utf-8') as f:
        nb = nbformat.read(f, as_version=4)

    curr_dir = os.getcwd()
    os.chdir(os.path.join('ml-training', 'notebooks'))
    
    global_env = {'plt': plt, 'os': os, 'pd': __import__('pandas'), 'np': __import__('numpy')}
    
    for idx, cell in enumerate(nb.cells):
        if cell.cell_type == 'code':
            code = cell.source
            print(f"Executing code cell {idx+1}...")
            
            import sys
            from io import StringIO
            old_stdout = sys.stdout
            redirected_output = StringIO()
            sys.stdout = redirected_output
            
            try:
                exec(code, global_env)
                stdout_text = redirected_output.getvalue()
                cell.outputs = []
                if stdout_text:
                    cell.outputs.append(nbformat.v4.new_output(
                        output_type='stream',
                        name='stdout',
                        text=stdout_text
                    ))
            except Exception as e:
                print(f"Error executing cell {idx+1}: {e}")
                cell.outputs = [nbformat.v4.new_output(
                    output_type='stream',
                    name='stderr',
                    text=str(e)
                )]
            finally:
                sys.stdout = old_stdout

    os.chdir(curr_dir)
    with open(NOTEBOOK_PATH, 'w', encoding='utf-8') as f:
        nbformat.write(nb, f)
        
    print(f"[OK] Notebook successfully executed and updated with outputs at '{NOTEBOOK_PATH}'")

if __name__ == '__main__':
    execute_notebook_manually()
