from flask import Flask, render_template, request, jsonify
import random
import os
from datetime import datetime
import json

app = Flask(__name__)

SAVE_FOLDER = 'static/saves'
os.makedirs(SAVE_FOLDER, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/assign', methods=['POST'])
def assign_seats():
    data = request.json
    last_number = int(data.get('last_number', 0))
    skipped_numbers = data.get('absences', [])
    positions = data.get('seats', [])

    all_numbers = [i for i in range(1, last_number + 1) if i not in skipped_numbers]
    random.shuffle(all_numbers)

    assigned = []
    for i in range(len(positions)):
        if i < len(all_numbers):
            assigned.append({
                'number': all_numbers[i],
                'seat': {'x': positions[i]['x'], 'y': positions[i]['y']}
            })
        else:
            assigned.append({
                'number': None,
                'seat': {'x': positions[i]['x'], 'y': positions[i]['y']}
            })

    return jsonify({'status': 'success', 'assigned': assigned})

@app.route('/save', methods=['POST'])
def save_seating():
    data = request.json
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = os.path.join(SAVE_FOLDER, f'seat_{timestamp}.json')

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return jsonify({'status': 'saved', 'filename': filename})

@app.route('/saved')
def saved_list():
    saved_files = sorted(os.listdir(SAVE_FOLDER), reverse=True)
    saved_data = []

    for file in saved_files:
        if file.endswith('.json'):
            with open(os.path.join(SAVE_FOLDER, file), 'r', encoding='utf-8') as f:
                content = json.load(f)
                saved_data.append(content)

    return jsonify(saved_data)

@app.route('/vote')
def vote_page():
    # 최근 3개만 읽도록 수정
    saved_files = sorted(os.listdir(SAVE_FOLDER), reverse=True)[:3]
    layouts = []

    for file in saved_files:
        if file.endswith('.json'):
            with open(os.path.join(SAVE_FOLDER, file), 'r', encoding='utf-8') as f:
                content = json.load(f)
                layouts.append(content)

    return render_template('vote.html', layouts=layouts)


if __name__ == '__main__':
    app.run(debug=True)
