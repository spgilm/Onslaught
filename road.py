import pygame
import sys

# Initialize PyGame
pygame.init()

# Screen setup
WIDTH, HEIGHT = 800, 600
screen = pygame.display.set_mode((WIDTH, HEIGHT))  # Create the game window
pygame.display.set_caption("Map Editor - Press S or E, then Click")  # Set window title

# Colors used in the game
WHITE = (255, 255, 255)
GREEN = (0, 200, 0)
RED = (200, 0, 0)
BLACK = (0, 0, 0)

# Font setup for displaying text on points
font = pygame.font.SysFont(None, 24)

# State variables to store the start and end points
start_point = None
end_point = None
mode = None  # Current mode: either 'start' or 'end'

# Main game loop
running = True
while running:
    screen.fill(WHITE)  # Clear screen with white background

    # Draw the road if both start and end points are defined
    if start_point and end_point:
        pygame.draw.line(screen, BLACK, start_point, end_point, 4)  # Draw a black line between points

    # Draw the start point
    if start_point:
        pygame.draw.circle(screen, GREEN, start_point, 20)  # Green circle
        s_text = font.render('S', True, WHITE)  # 'S' label
        screen.blit(s_text, (start_point[0] - s_text.get_width() // 2, start_point[1] - s_text.get_height() // 2))

    # Draw the end point
    if end_point:
        pygame.draw.circle(screen, RED, end_point, 20)  # Red circle
        e_text = font.render('E', True, WHITE)  # 'E' label
        screen.blit(e_text, (end_point[0] - e_text.get_width() // 2, end_point[1] - e_text.get_height() // 2))

    # Event handling loop
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False  # Exit the game

        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_s:
                mode = 'start'  # Switch to start point mode
                print("Mode: Place Start Point")
            elif event.key == pygame.K_e:
                mode = 'end'  # Switch to end point mode
                print("Mode: Place End Point")

        elif event.type == pygame.MOUSEBUTTONDOWN:
            if mode == 'start':
                start_point = event.pos  # Set start point at mouse click position
            elif mode == 'end':
                end_point = event.pos  # Set end point at mouse click position

    pygame.display.flip()  # Update the display

# Quit PyGame and exit the program
pygame.quit()
sys.exit()
