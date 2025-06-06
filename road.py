# Enhanced Map Generator with PyGame
# Features: Waypoint placement, play/pause/stop, enemy waves (spaced 100px apart), timer, speed control, undo/redo, save/load functionality

import pygame
import sys
import math
import json
import time
from tkinter import Tk, filedialog

# Initialize PyGame and Tkinter
pygame.init()
Tk().withdraw()

# =============================
# Constants
# =============================
WIDTH, HEIGHT = 800, 600
FPS = 60

# Wave configuration
WAVE_INTERVAL = 60
ENEMY_COUNT = 10
ENEMY_RADIUS = 6
ENEMY_SPACING_PIXELS = 100  # Each enemy spaced by 100 pixels

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GREEN = (0, 255, 0)
RED = (255, 0, 0)
YELLOW = (255, 255, 0)
BLUE = (0, 0, 255)
GRAY = (200, 200, 200)

# =============================
# Game Setup
# =============================
screen = pygame.display.set_mode((WIDTH, HEIGHT), pygame.RESIZABLE)
pygame.display.set_caption("Map Generator")
clock = pygame.time.Clock()
font = pygame.font.SysFont(None, 24)

# =============================
# UI Elements
# =============================
play_button_rect = pygame.Rect(10, 10, 80, 30)
stop_button_rect = pygame.Rect(100, 10, 80, 30)
save_button_rect = pygame.Rect(190, 10, 80, 30)
load_button_rect = pygame.Rect(280, 10, 80, 30)
slider_rect = pygame.Rect(WIDTH - 60, 50, 20, 400)
slider_knob_y = slider_rect.y + int(slider_rect.height * 0.9 + 0.5)
slider_dragging = False

# =============================
# Game State Variables
# =============================
full_screen = False
placing_mode = None
moving_point = None
clicking_midpoint = False

start_point = None
end_point = None
waypoints = []
midpoints = []
undo_stack = []
redo_stack = []

# Enemies and timing
enemies = []
enemy_path = []
default_speed = 2
enemy_speed_factor = 1.0

wave_timer = WAVE_INTERVAL
last_wave_time = time.time()
playing = False
paused = False

# =============================
# Utility Functions
# =============================
def draw_text(text, pos, color=BLACK):
    screen.blit(font.render(text, True, color), pos)

def draw_circle_with_label(pos, color, label):
    if pos:
        pygame.draw.circle(screen, color, pos, 15)
        draw_text(label, (pos[0] - 5, pos[1] - 8))

def draw_flag(pos):
    pygame.draw.polygon(screen, YELLOW, [(pos[0], pos[1]), (pos[0]+10, pos[1]-5), (pos[0]+10, pos[1]+5)])
    pygame.draw.line(screen, BLACK, (pos[0], pos[1]), (pos[0], pos[1] + 10), 2)

def midpoint(p1, p2):
    return [(p1[0] + p2[0]) // 2, (p1[1] + p2[1]) // 2]

def is_point_near(pos, point, radius=15):
    return point and ((pos[0] - point[0]) ** 2 + (pos[1] - point[1]) ** 2 <= radius ** 2)

def save_state():
    undo_stack.append((start_point[:] if start_point else None,
                       end_point[:] if end_point else None,
                       [wp[:] for wp in waypoints]))
    redo_stack.clear()

def load_state(state):
    global start_point, end_point, waypoints
    start_point = state[0][:] if state[0] else None
    end_point = state[1][:] if state[1] else None
    waypoints = [wp[:] for wp in state[2]]

def build_midpoints():
    global midpoints
    midpoints = []
    path = [start_point] + waypoints + [end_point] if start_point and end_point else []
    for i in range(len(path) - 1):
        midpoints.append(midpoint(path[i], path[i + 1]))

def build_enemy_path():
    global enemy_path
    enemy_path = [start_point] + waypoints + [end_point]

def launch_wave():
    build_enemy_path()
    if len(enemy_path) < 2:
        return
    for i in range(ENEMY_COUNT):
        enemies.append({"pos": enemy_path[0][:], "index": 0, "distance": -i * ENEMY_SPACING_PIXELS})

def move_enemies():
    for enemy in enemies:
        if enemy["index"] >= len(enemy_path) - 1:
            continue
        start = enemy_path[enemy["index"]]
        end = enemy_path[enemy["index"] + 1]
        dx, dy = end[0] - start[0], end[1] - start[1]
        segment_length = math.hypot(dx, dy)

        if segment_length == 0:
            enemy["index"] += 1
            continue

        enemy["distance"] += default_speed * enemy_speed_factor

        if enemy["distance"] >= segment_length:
            enemy["distance"] -= segment_length
            enemy["index"] += 1
            if enemy["index"] >= len(enemy_path) - 1:
                continue
            start = enemy_path[enemy["index"]]
            end = enemy_path[enemy["index"] + 1]
            dx, dy = end[0] - start[0], end[1] - start[1]
            segment_length = math.hypot(dx, dy)
            if segment_length == 0:
                continue

        t = enemy["distance"] / segment_length
        enemy["pos"] = [start[0] + dx * t, start[1] + dy * t]

def reset_wave():
    global enemies, wave_timer, last_wave_time
    enemies.clear()
    wave_timer = WAVE_INTERVAL
    last_wave_time = time.time()

def save_map():
    path = filedialog.asksaveasfilename(defaultextension=".json", filetypes=[("JSON", "*.json")])
    if path:
        with open(path, 'w') as f:
            json.dump({'start': start_point, 'end': end_point, 'waypoints': waypoints}, f)

def load_map():
    global start_point, end_point, waypoints
    path = filedialog.askopenfilename(filetypes=[("JSON", "*.json")])
    if path:
        with open(path, 'r') as f:
            data = json.load(f)
            start_point = data['start']
            end_point = data['end']
            waypoints = data['waypoints']

# =============================
# Main Loop
# =============================
running = True
while running:
    screen.fill(WHITE)
    build_midpoints()

    if playing and not paused:
        current_time = time.time()
        elapsed = (current_time - last_wave_time) * enemy_speed_factor
        wave_timer = max(0, WAVE_INTERVAL - int(elapsed))
        if elapsed >= WAVE_INTERVAL:
            launch_wave()
            last_wave_time = current_time

    pygame.draw.rect(screen, BLACK, play_button_rect, 2)
    draw_text("Pause" if playing and not paused else "Play", (play_button_rect.x + 10, play_button_rect.y + 5))
    pygame.draw.rect(screen, BLACK, stop_button_rect, 2)
    draw_text("Stop", (stop_button_rect.x + 15, stop_button_rect.y + 5))
    pygame.draw.rect(screen, BLACK, save_button_rect, 2)
    draw_text("Save", (save_button_rect.x + 15, save_button_rect.y + 5))
    pygame.draw.rect(screen, BLACK, load_button_rect, 2)
    draw_text("Load", (load_button_rect.x + 15, load_button_rect.y + 5))

    pygame.draw.rect(screen, GRAY, slider_rect)
    pygame.draw.rect(screen, BLACK, (slider_rect.x - 5, slider_knob_y - 5, slider_rect.width + 10, 10))
    percent = int(round(1000 * (1 - (slider_knob_y - slider_rect.y) / slider_rect.height)))
    draw_text(f"{percent}%", (slider_rect.x - 10, slider_rect.y - 25))
    enemy_speed_factor = percent / 100.0

    draw_text(f"Next wave in: {wave_timer}s", (10, 50))

    path = [start_point] + waypoints + [end_point] if start_point and end_point else []
    for i in range(len(path) - 1):
        pygame.draw.line(screen, BLACK, path[i], path[i + 1], 3)

    draw_circle_with_label(start_point, GREEN, 'S')
    draw_circle_with_label(end_point, RED, 'E')
    for wp in waypoints:
        draw_flag(wp)
    for mp in midpoints:
        pygame.draw.circle(screen, YELLOW, mp, 10)
        draw_text('+', (mp[0] - 4, mp[1] - 8))

    if playing and not paused:
        move_enemies()

    for enemy in enemies:
        pygame.draw.circle(screen, BLUE, (int(enemy["pos"][0]), int(enemy["pos"][1])), ENEMY_RADIUS)
        pygame.draw.circle(screen, BLACK, (int(enemy["pos"][0]), int(enemy["pos"][1])), ENEMY_RADIUS, 1)

    pygame.display.flip()
    clock.tick(FPS)

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                running = False
            elif event.key == pygame.K_F11:
                full_screen = not full_screen
                screen = pygame.display.set_mode((0, 0), pygame.FULLSCREEN) if full_screen else pygame.display.set_mode((WIDTH, HEIGHT), pygame.RESIZABLE)
            elif event.key == pygame.K_s:
                placing_mode = 'start'
            elif event.key == pygame.K_e:
                placing_mode = 'end'
            elif event.key == pygame.K_z and undo_stack:
                redo_stack.append((start_point[:], end_point[:], [wp[:] for wp in waypoints]))
                load_state(undo_stack.pop())
            elif event.key == pygame.K_y and redo_stack:
                undo_stack.append((start_point[:], end_point[:], [wp[:] for wp in waypoints]))
                load_state(redo_stack.pop())
            elif event.key == pygame.K_m:
                clicking_midpoint = True
        elif event.type == pygame.MOUSEBUTTONDOWN:
            mouse_pos = event.pos
            if slider_rect.collidepoint(mouse_pos):
                slider_dragging = True
            elif play_button_rect.collidepoint(mouse_pos):
                if not playing:
                    if start_point and end_point:
                        launch_wave()
                        playing = True
                        paused = False
                        last_wave_time = time.time()
                else:
                    paused = not paused
                    if not paused:
                        last_wave_time = time.time() - (WAVE_INTERVAL - wave_timer) / enemy_speed_factor
            elif stop_button_rect.collidepoint(mouse_pos):
                playing = False
                paused = False
                reset_wave()
            elif save_button_rect.collidepoint(mouse_pos):
                save_map()
            elif load_button_rect.collidepoint(mouse_pos):
                load_map()
            elif paused:
                continue
            elif clicking_midpoint:
                save_state()
                waypoints.append(list(mouse_pos))
                clicking_midpoint = False
            else:
                for i, mp in enumerate(midpoints):
                    if is_point_near(mouse_pos, mp, 10):
                        save_state()
                        waypoints.insert(i, list(mp))
                        break
                if placing_mode == 'start':
                    save_state()
                    start_point = list(mouse_pos)
                    placing_mode = None
                elif placing_mode == 'end':
                    save_state()
                    end_point = list(mouse_pos)
                    placing_mode = None
                elif is_point_near(mouse_pos, start_point):
                    save_state()
                    moving_point = ('start', start_point)
                elif is_point_near(mouse_pos, end_point):
                    save_state()
                    moving_point = ('end', end_point)
                else:
                    for i, wp in enumerate(waypoints):
                        if is_point_near(mouse_pos, wp):
                            save_state()
                            moving_point = ('waypoint', i)
                            break
        elif event.type == pygame.MOUSEBUTTONUP:
            slider_dragging = False
            moving_point = None
        elif event.type == pygame.MOUSEMOTION:
            if slider_dragging:
                slider_knob_y = max(slider_rect.y, min(slider_rect.y + slider_rect.height, event.pos[1]))
            elif moving_point and not paused:
                if moving_point[0] == 'start':
                    start_point = list(event.pos)
                elif moving_point[0] == 'end':
                    end_point = list(event.pos)
                elif moving_point[0] == 'waypoint':
                    waypoints[moving_point[1]] = list(event.pos)

pygame.quit()
sys.exit()
