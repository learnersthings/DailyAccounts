import urllib.request
import re
html = urllib.request.urlopen('https://docs.google.com/spreadsheets/d/1nn-ueVOfMYKiY-8rWqtg4wRKDXvvJoAhr4vwASJu_Yw/edit').read().decode('utf-8')
tabs = re.findall(r'\"name\":\"([^\"]+)\"', html)
print('TABS:', list(set(tabs)))
