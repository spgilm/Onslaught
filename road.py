import pygame
import sys
import ctypes

# Initialize PyGame
pygame.init()

# Enable full Windows system decorations (title bar with minimize/maximize/close buttons)
ctypes.windll.user32.ShowWindow(ctypes.windll.kernel32.GetConsoleWindow(), 1)

# Logical screen size (fixed virtual coordinate system)
LOGICAL_WIDTH, LOGICAL_HEIGHT = 800, 600
is_fullscreen = False  # Track fullscreen state
screen = pygame.display.set_mode((LOGICAL_WIDTH, LOGICAL_HEIGHT), pygame.RESIZABLE)
pygame.display.set_caption("Map Editor - Press S or E to Place")

# Colors
WHITE = (255, 255, 255)
GREEN = (0, 200, 0)
RED = (200, 0, 0)
BLACK = (0, 0, 0)
YELLOW = (255, 215, 0)

# Font
font = pygame.font.SysFont(None, 24)

# State
start_point = None
end_point = None
waypoints = []
mode = None  # 'start' or 'end'

dragging_start = False
dragging_end = False
dragging_waypoint_index = None
mouse_offset = (0, 0)

# Main loop
running = True
while running:
    # Get physical window size and calculate scale
    window_width, window_height = screen.get_size()
    scale_x = window_width / LOGICAL_WIDTH
    scale_y = window_height / LOGICAL_HEIGHT

    # Create a surface to render the scene at logical resolution
    surface = pygame.Surface((LOGICAL_WIDTH, LOGICAL_HEIGHT))
    surface.fill(WHITE)

    # Construct full path and draw it
    if start_point and end_point:
        path = [start_point] + waypoints + [end_point]
        for i in range(len(path) - 1):
            pygame.draw.line(surface, BLACK, path[i], path[i + 1], 4)

            # Draw yellow circle with + at midpoint
            mid_x = (path[i][0] + path[i + 1][0]) / 2
            mid_y = (path[i][1] + path[i + 1][1]) / 2
            pygame.draw.circle(surface, YELLOW, (int(mid_x), int(mid_y)), 8)
            plus = font.render('+', True, BLACK)
            surface.blit(plus, (mid_x - plus.get_width() // 2, mid_y - plus.get_height() // 2))

    # Draw start point
    if start_point:
        pygame.draw.circle(surface, GREEN, start_point, 12)
        s_text = font.render('S', True, WHITE)
        surface.blit(s_text, (start_point[0] - s_text.get_width() // 2, start_point[1] - s_text.get_height() // 2))

    # Draw end point
    if end_point:
        pygame.draw.circle(surface, RED, end_point, 12)
        e_text = font.render('E', True, WHITE)
        surface.blit(e_text, (end_point[0] - e_text.get_width() // 2, end_point[1] - e_text.get_height() // 2))

    # Draw waypoint flags
    for point in waypoints:
        pygame.draw.polygon(surface, YELLOW, [
            (point[0], point[1] - 10),
            (point[0] + 10, point[1]),
            (point[0], point[1] + 10)
        ])

    # Display instructions
    instructions = "[S]et Start | [E]nd Point | Drag points to move | Click + to add waypoint | F11 Fullscreen"
    text_surface = font.render(instructions, True, BLACK)
    surface.blit(text_surface, ((LOGICAL_WIDTH - text_surface.get_width()) // 2, LOGICAL_HEIGHT - 30))

    # Scale and blit to the main screen
    scaled_surface = pygame.transform.smoothscale(surface, (window_width, window_height))
    screen.blit(scaled_surface, (0, 0))

    # Event handling
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_s:
                mode = 'start'
            elif event.key == pygame.K_e:
                mode = 'end'
            elif event.key == pygame.K_F11:
                is_fullscreen = not is_fullscreen
                if is_fullscreen:
                    screen = pygame.display.set_mode((0, 0), pygame.FULLSCREEN)
                else:
                    screen = pygame.display.set_mode((LOGICAL_WIDTH, LOGICAL_HEIGHT), pygame.RESIZABLE)

        elif event.type == pygame.MOUSEBUTTONDOWN:
            mouse_pos = pygame.Vector2(event.pos[0] / scale_x, event.pos[1] / scale_y)

            if mode == 'start':
                start_point = mouse_pos
                mode = None
            elif mode == 'end':
                end_point = mouse_pos
                mode = None
            else:
                # Start drag or place waypoint
                if start_point and (pygame.Vector2(start_point) - mouse_pos).length() <= 12:
                    dragging_start = True
                    mouse_offset = mouse_pos - pygame.Vector2(start_point)
                elif end_point and (pygame.Vector2(end_point) - mouse_pos).length() <= 12:
                    dragging_end = True
                    mouse_offset = mouse_pos - pygame.Vector2(end_point)
                else:
                    for i, point in enumerate(waypoints):
                        if (pygame.Vector2(point) - mouse_pos).length() <= 12:
                            dragging_waypoint_index = i
                            mouse_offset = mouse_pos - pygame.Vector2(point)
                            break

                    # Check if clicked on any midpoint to insert a waypoint
                    if start_point and end_point:
                        path = [start_point] + waypoints + [end_point]
                        for i in range(len(path) - 1):
                            mid_x = (path[i][0] + path[i + 1][0]) / 2
                            mid_y = (path[i][1] + path[i + 1][1]) / 2
                            if (mouse_pos - pygame.Vector2(mid_x, mid_y)).length() <= 10:
                                waypoints.insert(i + 1, (mid_x, mid_y))
                                break

        elif event.type == pygame.MOUSEBUTTONUP:
            dragging_start = False
            dragging_end = False
            dragging_waypoint_index = None

        elif event.type == pygame.MOUSEMOTION:
            mouse_pos = pygame.Vector2(event.pos[0] / scale_x, event.pos[1] / scale_y)
            if dragging_start:
                start_point = (mouse_pos[0] - mouse_offset.x, mouse_pos[1] - mouse_offset.y)
            elif dragging_end:
                end_point = (mouse_pos[0] - mouse_offset.x, mouse_pos[1] - mouse_offset.y)
            elif dragging_waypoint_index is not None:
                waypoints[dragging_waypoint_index] = (mouse_pos[0] - mouse_offset.x, mouse_pos[1] - mouse_offset.y)

    pygame.display.flip()

pygame.quit()
sys.exit()