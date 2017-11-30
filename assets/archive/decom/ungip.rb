require_relative 'bingip'

out_file = "kod.png"
curr_dir = "#{File.expand_path(File.dirname(__FILE__))}"
dest_loc = "#{curr_dir}/decom"

zf       = DiffZipFileGen.new

zf.decomp out_file, dest_loc
