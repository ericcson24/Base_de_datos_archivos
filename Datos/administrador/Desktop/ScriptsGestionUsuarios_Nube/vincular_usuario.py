
import os
import ctypes

def es_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def main():
    if not es_admin():
        print("❌ Ejecuta este programa como administrador.")
        input("Presiona ENTER para salir...")
        return

    print("🔗 Vincular usuario a carpeta de nube")
    usuario = input("Nombre del usuario a vincular: ")
    carpeta_usuario = f'C:\\NubeDistribuible_v2\\Datos\\{usuario}'
    escritorio = f'C:\\Users\\{usuario}\\Desktop'

    if not os.path.exists(carpeta_usuario):
        print("❌ Ese usuario no tiene carpeta en la nube.")
        input("Presiona ENTER para salir...")
        return

    os.system(f'mklink /D "{escritorio}\\ArchivosNube" "{carpeta_usuario}"')
    print("✅ Acceso directo creado.")
    input("Presiona ENTER para salir.")

if __name__ == "__main__":
    main()
