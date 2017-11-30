require 'zip'

# This is a simple example which uses rubyzip to
# recursively generate a zip file from the contents of
# a specified directory. The directory itself is not
# included in the archive, rather just its contents.
#
# Usage:
#   directoryToZip = "/tmp/input"
#   output_file = "/tmp/out.zip"
#   zf = ZipFileGenerator.new(directoryToZip, output_file)
#   zf.write()
class ZipFileGenerator
#   def initialize(inputDir, outputFile)
#     @inputDir   = inputDir
#     @outputFile = outputFile
#   end
end

class DiffZipFileGen < ZipFileGenerator
  attr_accessor :input_dir

# Initialize with the directory to zip and the location of the output archive.
# def initialize a,b
#   @input_dir = nil
# end

# def initialize
#
# end

  def initialize (inputDir = nil, outputFile = nil)
    @inputDir   = inputDir
    @outputFile = outputFile
  end

# Zip the input directory.
  def comp(input_dir, output_file)
    @inputDir   = input_dir
    # @input_dir  = @inputDir
    @outputFile = output_file
    FileUtils.rm @outputFile if File.exists? @outputFile
    # File.open(output_file, 'w')
    entries = Dir.entries(@inputDir); entries.delete("."); entries.delete("..")
    io = Zip::File.open(@outputFile, Zip::File::CREATE)

    writeEntries(entries, "", io)
    io.close
    puts "\n#{output_file} chaching!\n\n"
  end

  def decomp file, dest_loc
    if File.exists?(dest_loc)
      puts "\ndeleting existing Decomp dir: #{dest_loc}"
      FileUtils.remove_dir(dest_loc)
    end
    # puts "creating new Decomp dir: #{dest_loc}"
    FileUtils.mkdir_p(dest_loc)

    Zip::File.open(file) do |zip_file|
      # if File.exists?(zip_file.name)
      #   puts "already exists! #{zip_file}"
      #   next
      # end
      # Handle entries one by one
      zip_file.each do |entry|
        dest = "#{dest_loc}/#{entry.name}"
        # Extract to file/directory/symlink
        # puts "Extracting #{entry.name} \tto\t #{dest}"
        puts "Extracting #{entry.name}"
        # entry.extract(dest_file)
        entry.extract(dest)

        # Read into memory
        content = entry.get_input_stream.read rescue ''
      end

      # Find specific entry
      # entry = zip_file.glob('*.csv').first
      puts "\n#{zip_file} chaching!"
    end
  end

# A helper method to make the recursion work.
  private
  def writeEntries(entries, path, io)

    entries.each { |e|
      zipFilePath  = path == "" ? e : File.join(path, e)
      diskFilePath = File.join(@inputDir, zipFilePath)
      puts "Deflating " + diskFilePath
      if File.directory?(diskFilePath)
        io.mkdir(zipFilePath)
        subdir =Dir.entries(diskFilePath); subdir.delete("."); subdir.delete("..")
        writeEntries(subdir, zipFilePath, io)
      else
        io.get_output_stream(zipFilePath) { |f| f.puts(File.open(diskFilePath, "rb").read()) }
      end
      # puts "done with #{diskFilePath}"
    }
  end


end


# exec ----------------------------------------------------------

#
# # init
# zf       = DiffZipFileGen.new
#
# # comp
# curr_dir = "#{File.expand_path(File.dirname(__FILE__))}"
# out_file = "kod.png"
# in_dir  = 'com'
#
# zf.comp "#{curr_dir}/#{in_dir}", out_file
#
#
# # decomp
# dest_loc = "#{curr_dir}/decom"
#
# zf.decomp out_file, dest_loc
