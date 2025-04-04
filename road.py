# Map Generator with PyGame - Fully Commented Version (Fixed Undo Crash, Speed Slider Included)
import pygame
import sys
import math

# Initialize PyGame
pygame.init()

# Constants
WIDTH, HEIGHT = 800, 600
FPS = 60

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GREEN = (0, 255, 0)
RED = (255, 0, 0)
YELLOW = (255, 255, 0)
BLUE = (0, 0, 255)
GRAY = (200, 200, 200)

# Setup display
screen = pygame.display.set_mode((WIDTH, HEIGHT), pygame.RESIZABLE)
pygame.display.set_caption("Map Generator")
clock = pygame.time.Clock()

# State
full_screen = False
placing_mode = None
moving_point = None
clicking_midpoint = False

# Map Data
start_point = None
end_point = None
waypoints = []
midpoints = []
undo_stack = []
redo_stack = []

# Enemy
enemy = None
enemy_path = []
enemy_index = 0
default_speed = 2
enemy_speed_factor = 1.0  # from slider (1.0 = 100%)

# UI
font = pygame.font.SysFont(None, 24)
play_button_rect = pygame.Rect(10, 10, 80, 30)
playing = False

# Slider for speed (0% to 500%)
slider_rect = pygame.Rect(WIDTH - 60, 50, 20, 400)
slider_knob_y = slider_rect.y + slider_rect.height // 5  # 100% default
slider_dragging = False

# Drawing helpers
def draw_text(text, pos, color=BLACK):
    img = font.render(text, True, color)
    screen.blit(img, pos)

def draw_circle_with_label(pos, color, label):
    pygame.draw.circle(screen, color, pos, 15)
    draw_text(label, (pos[0]-5, pos[1]-8), BLACK)

def draw_flag(pos):
    pygame.draw.polygon(screen, YELLOW, [(pos[0], pos[1]), (pos[0]+10, pos[1]-5), (pos[0]+10, pos[1]+5)])
    pygame.draw.line(screen, BLACK, (pos[0], pos[1]), (pos[0], pos[1]+10), 2)

def midpoint(p1, p2):
    return ((p1[0] + p2[0]) // 2, (p1[1] + p2[1]) // 2)

def is_point_near(pos, point, radius=15):
    return point and ((pos[0]-point[0])**2 + (pos[1]-point[1])**2 <= radius**2)

def save_state():
    undo_stack.append((start_point[:] if start_point else None,
                       end_point[:] if end_point else None,
                       [wp[:] for wp in waypoints]))
    redo_stack.clear()
    if len(undo_stack) > 50:
        undo_stack.pop(0)

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
    global enemy_path, enemy_index, enemy
    enemy_path = [start_point] + waypoints + [end_point]
    enemy_index = 0
    enemy = enemy_path[0][:]

def move_enemy():
    global enemy, enemy_index, playing
    if enemy_index >= len(enemy_path) - 1:
        playing = False
        return
    target = enemy_path[enemy_index + 1]
    dx, dy = target[0] - enemy[0], target[1] - enemy[1]
    dist = math.hypot(dx, dy)
    speed = default_speed * enemy_speed_factor
    if dist < speed:
        enemy = target[:]
        enemy_index += 1
    else:
        enemy[0] += speed * dx / dist
        enemy[1] += speed * dy / dist

running = True
while running:
    screen.fill(WHITE)
    build_midpoints()

    # UI: Play Button
    pygame.draw.rect(screen, BLACK, play_button_rect, 2)
    draw_text("Stop" if playing else "Play", (play_button_rect.x + 10, play_button_rect.y + 5))

    # UI: Speed Slider
    pygame.draw.rect(screen, GRAY, slider_rect)
    pygame.draw.rect(screen, BLACK, (slider_rect.x - 5, slider_knob_y - 5, slider_rect.width + 10, 10))
    percent = 500 * (1 - (slider_knob_y - slider_rect.y) / slider_rect.height)
    draw_text(f"{int(percent)}%", (slider_rect.x - 10, slider_rect.y - 25))
    enemy_speed_factor = percent / 100.0

    # Draw path lines
    path = [start_point] + waypoints + [end_point] if start_point and end_point else []
    for i in range(len(path) - 1):
        pygame.draw.line(screen, BLACK, path[i], path[i + 1], 3)

    # Draw points
    if start_point:
        draw_circle_with_label(start_point, GREEN, 'S')
    if end_point:
        draw_circle_with_label(end_point, RED, 'E')
    for wp in waypoints:
        draw_flag(wp)
    for mp in midpoints:
        pygame.draw.circle(screen, YELLOW, mp, 10)
        draw_text('+', (mp[0]-4, mp[1]-8), BLACK)

    # Draw enemy
    if playing and enemy:
        move_enemy()
        pygame.draw.circle(screen, BLUE, (int(enemy[0]), int(enemy[1])), 6)

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
                redo_stack.append((start_point[:] if start_point else None,
                                   end_point[:] if end_point else None,
                                   [wp[:] for wp in waypoints]))
                load_state(undo_stack.pop())
            elif event.key == pygame.K_y and redo_stack:
                undo_stack.append((start_point[:] if start_point else None,
                                   end_point[:] if end_point else None,
                                   [wp[:] for wp in waypoints]))
                load_state(redo_stack.pop())
            elif event.key == pygame.K_m:
                clicking_midpoint = True

        elif event.type == pygame.MOUSEBUTTONDOWN:
            if slider_rect.collidepoint(event.pos):
                slider_dragging = True

            mouse_pos = event.pos

            if play_button_rect.collidepoint(mouse_pos):
                if not playing and start_point and end_point:
                    build_enemy_path()
                    playing = True
                else:
                    playing = False
                    enemy = None
                continue

            if playing:
                continue

            if clicking_midpoint:
                save_state()
                waypoints.append(list(mouse_pos))
                clicking_midpoint = False
                continue

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
                y = max(slider_rect.y, min(slider_rect.y + slider_rect.height, event.pos[1]))
                slider_knob_y = y
            elif moving_point and not playing:
                pos = event.pos
                if moving_point[0] == 'start':
                    start_point = list(pos)
                elif moving_point[0] == 'end':
                    end_point = list(pos)
                elif moving_point[0] == 'waypoint':
                    waypoints[moving_point[1]] = list(pos)

pygame.quit()
sys.exit()
