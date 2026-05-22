package demo;

import java.nio.file.Files;
import java.nio.file.Path;

import net.sourceforge.swaplist.SwapList;

public final class SwapListDemo {

    private SwapListDemo() {
    }

    public static void main(String[] args) throws Exception {
        String firstSwapFile;

        try (SwapList<String> list = new SwapList<>(500)) {
            for (int i = 0; i < 5000; i++) {
                list.add("Data item #" + i);
            }

            firstSwapFile = list.getSwapFileName(0);

            System.out.println("Size: " + list.size());
            System.out.println("Current page index: " + list.getCurrentPageIndex());
            System.out.println("Saved pages on disk: " + (list.getSavedPageIndex() + 1));
            System.out.println("First item: " + list.get(0));
            System.out.println("Last item: " + list.get(4999));
            System.out.println("First swap file exists while list is open: " + Files.exists(Path.of(firstSwapFile)));
            System.out.println("Sample swap file: " + firstSwapFile);
        }

        System.out.println("First swap file exists after close(): " + Files.exists(Path.of(firstSwapFile)));
    }
}
