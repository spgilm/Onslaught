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

# Font
font = pygame.font.SysFont(None, 24)

# State
start_point = None
end_point = None
mode = None  # 'start' or 'end'

dragging_start = False
dragging_end = False
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

    # Draw line between start and end
    if start_point and end_point:
        pygame.draw.line(surface, BLACK, start_point, end_point, 4)

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

    # Display instructions
    instructions = "[S]et Start | [E]nd Point | Drag points to move | F11 Fullscreen"
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
            # Convert from physical to logical coordinates
            mouse_pos = pygame.Vector2(event.pos[0] / scale_x, event.pos[1] / scale_y)

            if mode == 'start':
                start_point = mouse_pos
                mode = None
            elif mode == 'end':
                end_point = mouse_pos
                mode = None
            else:
                if start_point and (pygame.Vector2(start_point) - mouse_pos).length() <= 20:
                    dragging_start = True
                    mouse_offset = mouse_pos - pygame.Vector2(start_point)
                elif end_point and (pygame.Vector2(end_point) - mouse_pos).length() <= 20:
                    dragging_end = True
                    mouse_offset = mouse_pos - pygame.Vector2(end_point)

        elif event.type == pygame.MOUSEBUTTONUP:
            dragging_start = False
            dragging_end = False

        elif event.type == pygame.MOUSEMOTION:
            mouse_pos = pygame.Vector2(event.pos[0] / scale_x, event.pos[1] / scale_y)
            if dragging_start:
                start_point = (mouse_pos[0] - mouse_offset.x, mouse_pos[1] - mouse_offset.y)
            elif dragging_end:
                end_point = (mouse_pos[0] - mouse_offset.x, mouse_pos[1] - mouse_offset.y)

    pygame.display.flip()

pygame.quit()
sys.exit()
